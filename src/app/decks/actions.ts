"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  type ActionState,
  cardSchema,
  deckSchema,
  formFields,
  idSchema,
} from "@/lib/validation";

// Server Actions are public endpoints: every ID below came from the browser
// and is untrusted. RLS hides rows the user doesn't own, so an UPDATE/DELETE
// on someone else's row matches 0 rows *without* an error. We call .select()
// to get the affected rows back and treat an empty result as "not found".

const NOT_FOUND: ActionResult = { ok: false, error: "Not found." };
const FAILED: ActionResult = { ok: false, error: "Something went wrong. Try again." };

// Postgres foreign key violation: e.g. inserting a card into a deck the user
// doesn't own (the composite FK (deck_id, user_id) has no match).
const FK_VIOLATION = "23503";

function invalid(error: z.ZodError): ActionResult {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors };
}

// ---------------------------------------------------------------- decks

export async function createDeck(_prev: ActionState, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deckSchema.safeParse(formFields(formData, ["title", "description"]));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("decks")
    .insert({ user_id: user.id, ...parsed.data });
  if (error) {
    console.error("createDeck", error);
    return FAILED;
  }

  refresh();
  return { ok: true };
}

export async function updateDeck(
  deckId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(deckId).success) return NOT_FOUND;
  const parsed = deckSchema.safeParse(formFields(formData, ["title", "description"]));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .update(parsed.data)
    .eq("id", deckId)
    .select("id");
  if (error) {
    console.error("updateDeck", error);
    return FAILED;
  }
  if (data.length === 0) return NOT_FOUND;

  refresh();
  return { ok: true };
}

export async function deleteDeck(deckId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(deckId).success) return NOT_FOUND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .delete()
    .eq("id", deckId)
    .select("id");
  if (error) {
    console.error("deleteDeck", error);
    return FAILED;
  }
  if (data.length === 0) return NOT_FOUND;

  // The deck page no longer exists, so leave it.
  redirect("/decks");
}

// ---------------------------------------------------------------- cards

const CARD_FIELDS = ["front", "back"] as const;

export async function createCard(
  deckId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(deckId).success) return NOT_FOUND;
  const parsed = cardSchema.safeParse(formFields(formData, CARD_FIELDS));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .insert({ deck_id: deckId, user_id: user.id, ...parsed.data });
  if (error) {
    if (error.code === FK_VIOLATION) return NOT_FOUND;
    console.error("createCard", error);
    return FAILED;
  }

  refresh();
  return { ok: true };
}

export async function updateCard(
  cardId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(cardId).success) return NOT_FOUND;
  const parsed = cardSchema.safeParse(formFields(formData, CARD_FIELDS));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .update(parsed.data)
    .eq("id", cardId)
    .select("id");
  if (error) {
    console.error("updateCard", error);
    return FAILED;
  }
  if (data.length === 0) return NOT_FOUND;

  refresh();
  return { ok: true };
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(cardId).success) return NOT_FOUND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId)
    .select("id");
  if (error) {
    console.error("deleteCard", error);
    return FAILED;
  }
  if (data.length === 0) return NOT_FOUND;

  refresh();
  return { ok: true };
}
