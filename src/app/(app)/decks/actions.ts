"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  type ActionState,
  type CardInput,
  cardSchema,
  deckSchema,
  formFields,
  frontKey,
  idSchema,
  importSchema,
  type ImportResult,
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

// ---------------------------------------------------------------- import

// PostgREST returns at most this many rows per request (max_rows in
// supabase/config.toml), so existing fronts are read in pages.
const PAGE_SIZE = 1000;

export async function importCards(
  deckId: string,
  cards: CardInput[],
  options: { skipExisting: boolean },
): Promise<ImportResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(deckId).success) return { ok: false, error: "Not found." };

  // The browser already parsed and filtered these, but the arguments can be
  // forged, so validate the whole payload again.
  const parsed = importSchema.safeParse({ cards, skipExisting: options?.skipExisting });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const index = issue?.path[0] === "cards" ? issue.path[1] : undefined;
    const prefix = typeof index === "number" ? `Card ${index + 1}: ` : "";
    return { ok: false, error: `${prefix}${issue?.message ?? "Invalid import."}` };
  }

  const supabase = await createClient();
  let rows = parsed.data.cards;

  if (parsed.data.skipExisting) {
    const seen = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("cards")
        .select("front")
        .eq("deck_id", deckId)
        .eq("user_id", user.id)
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        console.error("importCards: existing fronts", error);
        return { ok: false, error: "Something went wrong. Try again." };
      }
      for (const card of data) seen.add(frontKey(card.front));
      if (data.length < PAGE_SIZE) break;
    }
    // Also drops repeats within this import (the set grows as we go).
    rows = rows.filter((card) => {
      const key = frontKey(card.front);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const skippedDuplicates = parsed.data.cards.length - rows.length;
  if (rows.length === 0) return { ok: true, imported: 0, skippedDuplicates };

  // One INSERT statement: all rows are saved, or none are.
  const { error } = await supabase
    .from("cards")
    .insert(rows.map((card) => ({ ...card, deck_id: deckId, user_id: user.id })));
  if (error) {
    if (error.code === FK_VIOLATION) return { ok: false, error: "Not found." };
    console.error("importCards: insert", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }

  refresh();
  return { ok: true, imported: rows.length, skippedDuplicates };
}
