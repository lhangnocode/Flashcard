import { z } from "zod";
import { type QuizQuestionInput, quizQuestionSchema } from "@/lib/validation";

export type SkippedQuizRow = { row: number; text: string; reason: string };
export type QuizParseResult = { questions: QuizQuestionInput[]; skipped: SkippedQuizRow[] };

// One question per line:
//   Question | Option 1 | Option 2 | Option 3 | Option 4 | Answer | Explanation
// Answer is 1–4 or A–D. Everything after the 6th "|" is the explanation (so
// it may contain "|"), and a literal \n in it becomes a line break.
// Blank lines and lines starting with "#" are ignored.
// Pure function: the dialog uses it for the preview; the server validates
// the resulting array again on its own.
export function parseQuizImport(raw: string): QuizParseResult {
  const result: QuizParseResult = { questions: [], skipped: [] };
  const lines = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");

  lines.forEach((line, index) => {
    const row = index + 1;
    const text = line.trim();
    if (text === "" || text.startsWith("#")) return;

    const tokens = text.split("|").map((token) => token.trim());
    if (tokens.length < 6) {
      result.skipped.push({
        row,
        text,
        reason: `expected 6+ fields separated by "|", found ${tokens.length}`,
      });
      return;
    }

    const [question, a, b, c, d, answer, ...rest] = tokens;
    const correctIndex = answerIndex(answer);
    if (correctIndex === null) {
      result.skipped.push({ row, text, reason: `answer must be 1–4 or A–D, got "${answer}"` });
      return;
    }

    const explanation = rest.join(" | ").replace(/\\n/g, "\n");
    const parsed = quizQuestionSchema.safeParse({
      question,
      options: [a, b, c, d],
      correct_index: correctIndex,
      explanation,
    });
    if (!parsed.success) {
      result.skipped.push({ row, text, reason: describe(parsed.error) });
      return;
    }
    result.questions.push(parsed.data);
  });

  return result;
}

function answerIndex(token: string) {
  if (/^[1-4]$/.test(token)) return Number(token) - 1;
  if (/^[a-d]$/i.test(token)) return token.toUpperCase().charCodeAt(0) - 65;
  return null;
}

const FIELD_NAMES = ["option 1", "option 2", "option 3", "option 4"];

// e.g. "missing question", "option 3: Required", "explanation: Max 5000 characters".
function describe(error: z.ZodError) {
  const issue = error.issues[0];
  const [field, index] = issue.path;
  const name = field === "options" && typeof index === "number" ? FIELD_NAMES[index] : String(field);
  return issue.message === "Required" ? `missing ${name}` : `${name}: ${issue.message}`;
}
