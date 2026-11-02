import type { Tables } from "@/types/database.types";

// A quiz question as the quiz page loads it (generated row type, minus
// bookkeeping columns).
export type QuizQuestion = Pick<
  Tables<"quiz_questions">,
  "id" | "question" | "options" | "correct_index" | "explanation"
>;
