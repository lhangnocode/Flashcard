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
  back: requiredText(5000),
  reading: optionalText(5000),
  example: optionalText(5000),
  notes: optionalText(5000),
});

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
