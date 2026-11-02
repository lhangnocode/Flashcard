import type { QuizQuestion } from "@/types/quiz";

export type AttemptQuestion = {
  id: string;
  question: string;
  options: string[]; // shuffled
  correct: number; // index into the shuffled options
  explanation: string | null;
};

// Small seeded random generator (mulberry32). The same seed gives the same
// order on the server and in the browser, so the page hydrates without a
// mismatch; Retry picks a new seed.
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], next: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Shuffles the question order and each question's options.
export function buildAttempt(questions: QuizQuestion[], seed: number): AttemptQuestion[] {
  const next = random(seed);
  return shuffle(questions, next).map((q) => {
    const order = shuffle([0, 1, 2, 3], next);
    return {
      id: q.id,
      question: q.question,
      options: order.map((i) => q.options[i]),
      correct: order.indexOf(q.correct_index),
      explanation: q.explanation,
    };
  });
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}
