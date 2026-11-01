import { z } from "zod";
import { type CardInput, cardSchema, frontKey } from "@/lib/validation";

export type SkippedRow = { row: number; text: string; reason: string };

export type ParseResult = {
  cards: CardInput[];
  skipped: SkippedRow[];
  duplicatesInPaste: number;
};

// Lets users type "\n" or "\t" in a custom separator field, since a real
// newline or tab can't be typed into a one-line input.
export function unescapeSeparator(value: string) {
  return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

// Parses text exported from Quizlet (or any "term<sep>definition" list).
// Pure function: the dialog uses it for the live preview; the server never
// runs it and validates the resulting array on its own.
export function parseImport(
  raw: string,
  {
    termSeparator,
    cardSeparator,
    dedupe,
  }: { termSeparator: string; cardSeparator: string; dedupe: boolean },
): ParseResult {
  const result: ParseResult = { cards: [], skipped: [], duplicatesInPaste: 0 };
  const termSep = normalizeNewlines(termSeparator);
  const cardSep = normalizeNewlines(cardSeparator);
  if (!termSep || !cardSep) return result;

  const seen = new Set<string>();
  const chunks = normalizeNewlines(raw).split(cardSep);

  chunks.forEach((chunk, index) => {
    if (chunk.trim() === "") return; // blank and trailing lines

    // Split on the FIRST separator only, so commas/tabs in the back survive.
    const at = chunk.indexOf(termSep);
    const front = at === -1 ? chunk : chunk.slice(0, at);
    const back = at === -1 ? "" : chunk.slice(at + termSep.length);

    const parsed = cardSchema.safeParse({ front, back });
    if (!parsed.success) {
      result.skipped.push({ row: index + 1, text: chunk.trim(), reason: describe(parsed.error) });
      return;
    }
    if (dedupe) {
      const key = frontKey(parsed.data.front);
      if (seen.has(key)) {
        result.duplicatesInPaste += 1;
        return;
      }
      seen.add(key);
    }
    result.cards.push(parsed.data);
  });

  return result;
}

// "missing front", "missing back", or e.g. "front: Max 500 characters".
function describe(error: z.ZodError) {
  const fields = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.entries(fields)
    .map(([field, messages]) =>
      messages?.[0] === "Required" ? `missing ${field}` : `${field}: ${messages?.[0]}`,
    )
    .join(", ");
}
