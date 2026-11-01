"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult =
  | { ok: true }
  // retryable: a transient failure (network, server) worth retrying.
  // Not retryable: the review can never succeed (bad input, card gone).
  | { ok: false; retryable: boolean; error: string };

const reviewSchema = z.object({
  reviewId: z.uuid(),
  cardId: z.uuid(),
  rating: z.enum(["again", "good"]),
  durationMs: z.int().min(0).max(3_600_000),
});

// Records one review. The database function computes the new schedule;
// this action only authenticates and validates. It deliberately does NOT
// call refresh(): re-rendering the study page would reset the session.
export async function submitReview(input: {
  reviewId: string;
  cardId: string;
  rating: "again" | "good";
  durationMs: number;
}): Promise<ReviewResult> {
  await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, retryable: false, error: "Invalid review." };
  const { reviewId, cardId, rating, durationMs } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_card_review", {
    p_review_id: reviewId,
    p_card_id: cardId,
    p_rating: rating,
    p_review_duration_ms: durationMs,
  });

  if (!error) return { ok: true };
  if (error.code === "P0002") {
    return { ok: false, retryable: false, error: "Card not found (it may have been deleted)." };
  }
  if (error.code === "22023") {
    return { ok: false, retryable: false, error: "Invalid review." };
  }
  console.error("submitReview", error);
  return { ok: false, retryable: true, error: "Couldn't save the review." };
}
