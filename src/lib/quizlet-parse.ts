import { z } from "zod";
import { type CardInput, cardSchema, frontKey } from "@/lib/validation";

export type SkippedRow = { row: number; text: string; reason: string };

// Settings read from an Anki export's "#key:value" header lines.
export type AnkiFormat = {
  separator: string;
  separatorName: string; // e.g. "tab", for the dialog's notice
  html: boolean;
  metaColumns: number[]; // 0-based guid/notetype/deck/tags columns to leave out
};

export type ParseResult = {
  cards: CardInput[];
  skipped: SkippedRow[];
  duplicatesInPaste: number;
  anki: AnkiFormat | null; // null: parsed as a plain Quizlet-style list
};

// Lets users type "\n" or "\t" in a custom separator field, since a real
// newline or tab can't be typed into a one-line input.
export function unescapeSeparator(value: string) {
  return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

// Parses text exported from Quizlet (or any "term<sep>definition" list), or
// an Anki "Notes/Cards in Plain Text" export, detected by its header lines.
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
  const result: ParseResult = { cards: [], skipped: [], duplicatesInPaste: 0, anki: null };
  const text = normalizeNewlines(raw).replace(/^﻿/, ""); // files may start with a BOM
  const seen = new Set<string>();

  // Validates one card, then records it as imported, skipped or a repeat.
  const add = (row: number, rowText: string, front: string, back: string) => {
    const parsed = cardSchema.safeParse({ front: tidy(front), back: tidy(back) });
    if (!parsed.success) {
      result.skipped.push({ row, text: rowText.trim(), reason: describe(parsed.error) });
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
  };

  const header = readAnkiHeader(text);
  if (header) {
    result.anki = header.format;
    parseAnkiBody(text, header, result, add);
    return result;
  }

  const termSep = normalizeNewlines(termSeparator);
  const cardSep = normalizeNewlines(cardSeparator);
  if (!termSep || !cardSep) return result;

  text.split(cardSep).forEach((chunk, index) => {
    if (chunk.trim() === "") return; // blank and trailing lines
    // Split on the FIRST separator only, so commas/tabs in the back survive.
    const at = chunk.indexOf(termSep);
    const front = at === -1 ? chunk : chunk.slice(0, at);
    const back = at === -1 ? "" : chunk.slice(at + termSep.length);
    add(index + 1, chunk, front, back);
  });

  return result;
}

// ---------------------------------------------------------------------------
// Anki

// The separator names Anki writes in "#separator:"; a single literal
// character is accepted too.
const ANKI_SEPARATORS: Record<string, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  space: " ",
  pipe: "|",
  colon: ":",
};

// Only these keys count as a header, so a Quizlet term that happens to
// start with "#" (e.g. "#1 word<TAB>…") isn't mistaken for one.
const ANKI_KEYS = new Set([
  "separator",
  "html",
  "tags",
  "columns",
  "notetype",
  "deck",
  "guid column",
  "notetype column",
  "deck column",
  "tags column",
]);

type AnkiHeader = { format: AnkiFormat; bodyStart: number; bodyLine: number };

function readAnkiHeader(text: string): AnkiHeader | null {
  const format: AnkiFormat = { separator: "\t", separatorName: "tab", html: false, metaColumns: [] };
  let offset = 0;
  let line = 0;
  let found = false;

  while (offset < text.length && text[offset] === "#") {
    const end = text.indexOf("\n", offset);
    const lineText = text.slice(offset, end === -1 ? text.length : end);
    const match = /^#([a-z ]+):(.*)$/i.exec(lineText);
    const key = match?.[1].trim().toLowerCase();
    if (!match || !key || !ANKI_KEYS.has(key)) break;
    const value = match[2].trim();
    found = true;

    if (key === "separator") {
      const named = ANKI_SEPARATORS[value.toLowerCase()];
      if (named) {
        format.separator = named;
        format.separatorName = value.toLowerCase();
      } else if (value.length === 1) {
        format.separator = value;
        format.separatorName = `“${value}”`;
      }
    } else if (key === "html") {
      format.html = value.toLowerCase() === "true";
    } else if (key.endsWith(" column")) {
      const column = Number.parseInt(value, 10); // 1-based in the file
      if (column >= 1) format.metaColumns.push(column - 1);
    }

    line += 1;
    offset = end === -1 ? text.length : end + 1;
  }

  return found ? { format, bodyStart: offset, bodyLine: line + 1 } : null;
}

// Reads the body like a CSV file: a field wrapped in "…" may contain the
// separator and line breaks, and "" inside it stands for one ". Quotes
// only get this meaning in Anki mode; a Quizlet paste keeps them as text.
function parseAnkiBody(
  text: string,
  { format, bodyStart, bodyLine }: AnkiHeader,
  result: ParseResult,
  add: (row: number, rowText: string, front: string, back: string) => void,
) {
  const sep = format.separator;
  let i = bodyStart;
  let line = bodyLine;

  while (i < text.length) {
    const recordStart = i;
    const recordLine = line;
    const fields: string[] = [];
    let unclosed = false;

    // One record: fields until an unquoted line break or the end of the text.
    for (;;) {
      let field = "";
      if (text[i] === '"') {
        i += 1;
        for (;;) {
          if (i >= text.length) {
            unclosed = true;
            break;
          }
          const ch = text[i];
          if (ch === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
              continue;
            }
            i += 1;
            break;
          }
          if (ch === "\n") line += 1;
          field += ch;
          i += 1;
        }
        // Anything between the closing quote and the next separator is kept.
        while (i < text.length && text[i] !== "\n" && !text.startsWith(sep, i)) field += text[i++];
      } else {
        while (i < text.length && text[i] !== "\n" && !text.startsWith(sep, i)) field += text[i++];
      }
      fields.push(field);

      if (unclosed || i >= text.length) break;
      if (text[i] === "\n") {
        i += 1;
        line += 1;
        break;
      }
      i += sep.length; // separator: next field
    }

    const rowText = text.slice(recordStart, i);
    if (unclosed) {
      result.skipped.push({ row: recordLine, text: rowText.trim(), reason: "unclosed quote" });
      break;
    }
    if (fields.every((field) => field.trim() === "")) continue; // blank line

    const content = fields
      .filter((_, column) => !format.metaColumns.includes(column))
      .map((field) => (format.html ? cleanHtml(field) : field));
    const [front = "", ...rest] = content;
    // Notes with more than two fields keep the extras, after a blank line each.
    const back = rest.map(tidy).filter(Boolean).join("\n\n");
    add(recordLine, rowText, front, back);
  }
}

// Only for "#html:true" exports. This tidies text for display; it is not a
// security filter. React renders card text as text, so markup never runs.
function cleanHtml(value: string) {
  return decodeEntities(
    value
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      // A card export's back repeats the front up to this divider.
      .replace(/^[\s\S]*<hr\s+id=["']?answer["']?[^>]*>/i, "")
      .replace(/<br\s*\/?>/gi, "\n")
      // Block elements start on a new line (Anki writes lines as <div>…</div>).
      .replace(/<(div|p|li|tr|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  );
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// One pass, so "&amp;lt;" becomes "&lt;" rather than "<".
function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X"
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
  });
}

// Applied to every field in both modes: drops Anki/Quizlet audio references,
// trailing spaces on each line, and runs of blank lines.
function tidy(value: string) {
  return value
    .replace(/\[sound:[^\]]*\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
