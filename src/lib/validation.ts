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

// ---------------------------------------------------------------- search

export const SEARCH_MAX_LENGTH = 200;
export const SEARCH_RESULT_LIMIT = 100; // also enforced inside search_deck_cards
export const CARD_PAGE_SIZE = 50;
const MAX_SHOWN_CARDS = 10_000;

// Search params can be missing, repeated (?q=a&q=b → array), or forged.
const firstParam = (value: unknown) => (Array.isArray(value) ? value[0] : value);

// ---------------------------------------------------------------- passwords

// For NEW passwords only (sign-up, change). Sign-in has no length rule, so an
// account created under an older, shorter minimum can still sign in.
// Not trimmed: spaces are valid password characters. bcrypt (used by Supabase
// Auth) reads at most 72 BYTES; accented and Japanese characters take 2–3
// bytes each in UTF-8, so the limit is counted in bytes, not characters.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function passwordProblem(password: string): "too_short" | "too_long" | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "too_long";
  return null;
}

export const PASSWORD_MESSAGES = {
  too_short: `At least ${PASSWORD_MIN_LENGTH} characters`,
  too_long: `At most ${PASSWORD_MAX_BYTES} bytes (accented or Japanese characters count as 2–3)`,
} as const;

export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  const problem = passwordProblem(password);
  if (problem) ctx.addIssue({ code: "custom", message: PASSWORD_MESSAGES[problem] });
});

// ?q= → trimmed query, or "" when missing/blank/too long (show the normal list).
export function parseSearchQuery(value: unknown) {
  const parsed = z.string().trim().max(SEARCH_MAX_LENGTH).safeParse(firstParam(value));
  return parsed.success ? parsed.data : "";
}

// ?scope= → which side of the card to search; anything else means both.
export const SEARCH_SCOPES = ["all", "front", "back"] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];
export function parseSearchScope(value: unknown): SearchScope {
  const parsed = z.enum(SEARCH_SCOPES).safeParse(firstParam(value));
  return parsed.success ? parsed.data : "all";
}

// ?show= → how many cards to list, in steps of CARD_PAGE_SIZE.
export function parseShowCount(value: unknown) {
  const parsed = z.coerce
    .number()
    .int()
    .min(CARD_PAGE_SIZE)
    .max(MAX_SHOWN_CARDS)
    .safeParse(firstParam(value));
  return parsed.success ? Math.ceil(parsed.data / CARD_PAGE_SIZE) * CARD_PAGE_SIZE : CARD_PAGE_SIZE;
}

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

// ---------------------------------------------------------------- quiz

// Mirrors the checks on public.quiz_questions.
export const quizQuestionSchema = z.object({
  question: requiredText(1000),
  options: z.tuple([requiredText(500), requiredText(500), requiredText(500), requiredText(500)]),
  correct_index: z.number().int().min(0).max(3),
  explanation: z
    .string()
    .trim()
    .max(5000, "Max 5000 characters")
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type QuizQuestionInput = z.output<typeof quizQuestionSchema>;

export const MAX_QUIZ_IMPORT = 500;

export const quizImportSchema = z.object({
  questions: z
    .array(quizQuestionSchema)
    .min(1, "Nothing to import.")
    .max(MAX_QUIZ_IMPORT, `Maximum ${MAX_QUIZ_IMPORT} questions per import.`),
  replace: z.boolean(),
});

export type QuizImportResult =
  | { ok: true; imported: number }
  | { ok: false; error: string };

export type ExportResult =
  | { ok: true; title: string; count: number; text: string }
  | { ok: false; error: string };
