import { z } from "zod";

// Required text: trimmed, non-empty, capped.
const requiredText = (max: number) =>
  z.string().trim().min(1, "Required").max(max, `Max ${max} characters`);

// Optional text: trimmed, capped, and "" becomes null so the DB stores NULL.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Max ${max} characters`)
    .transform((value) => (value === "" ? null : value));

export const idSchema = z.uuid();

export const deckSchema = z.object({
  title: requiredText(200),
  description: optionalText(5000),
});

export const cardSchema = z.object({
  front: requiredText(500),
  // Multiline: definition plus any readings, examples and notes.
  back: requiredText(5000),
});

// ---------------------------------------------------------------- import

export const MAX_IMPORT_CARDS = 500;
export const MAX_IMPORT_BYTES = 500 * 1024; // raw pasted text, in UTF-8 bytes

// Server-side shape of an import. cardSchema strips unknown keys, so extra
// columns in a forged payload never reach the insert.
export const importSchema = z.object({
  cards: z
    .array(cardSchema)
    .min(1, "Nothing to import.")
    .max(
      MAX_IMPORT_CARDS,
      `Maximum ${MAX_IMPORT_CARDS} cards per import. Please split large decks into multiple batches.`,
    ),
  skipExisting: z.boolean(),
});

export type CardInput = { front: string; back: string };

// How two fronts are compared for "already exists": trimmed, case-insensitive.
export function frontKey(front: string) {
  return front.trim().toLowerCase();
}

export type ImportResult =
  | { ok: true; imported: number; skippedDuplicates: number }
  | { ok: false; error: string };

// Reads the named fields from FormData as strings ("" when missing).
export function formFields<K extends string>(formData: FormData, keys: readonly K[]) {
  return Object.fromEntries(
    keys.map((key) => {
      const value = formData.get(key);
      return [key, typeof value === "string" ? value : ""];
    }),
  ) as Record<K, string>;
}

// What every form action returns to the UI.
export type ActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[] | undefined> };

export type ActionState = ActionResult | null;
