"use client";

import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { type AttemptQuestion, buildAttempt, newSeed } from "@/lib/quiz-attempt";
import type { QuizQuestion } from "@/types/quiz";

const LETTERS = ["A", "B", "C", "D"];
const KEY_TO_INDEX: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };

// One quiz attempt. Not saved: results live only in this component.
// The page gives this component a key built from the question IDs, so a
// changed question set (e.g. after an import) starts a fresh attempt instead
// of resuming a stale one that Next kept while the page was hidden.
export function QuizRunner({
  deckId,
  questions,
  initialSeed,
}: {
  deckId: string;
  questions: QuizQuestion[];
  initialSeed: number;
}) {
  const [seed, setSeed] = useState(initialSeed);
  const attempt = useMemo(() => buildAttempt(questions, seed), [questions, seed]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // chosen option per question
  const [elapsedMs, setElapsedMs] = useState<number>();
  const startedAt = useRef(0);

  // The clock starts when the quiz is first shown. Effects re-run when Next
  // shows a page again after hiding it, so only the first run sets it;
  // Retry restarts it.
  useEffect(() => {
    if (startedAt.current === 0) startedAt.current = Date.now();
  }, []);

  const finished = index >= attempt.length;
  const current = attempt[index] as AttemptQuestion | undefined;
  const chosen = answers[index] as number | undefined;
  const answered = chosen !== undefined;

  function choose(option: number) {
    if (finished || answered) return; // one answer per question
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = option;
      return next;
    });
  }

  function goNext() {
    if (!answered) return;
    if (index + 1 >= attempt.length) setElapsedMs(Date.now() - startedAt.current);
    setIndex(index + 1);
  }

  function retry() {
    setSeed(newSeed());
    setIndex(0);
    setAnswers([]);
    setElapsedMs(undefined);
    startedAt.current = Date.now();
  }

  // Keys: 1–4 / A–D answer, Enter / Space go on. Removed while Next hides
  // this page, and while typing in a field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (finished) return;
      if (!answered) {
        const option = KEY_TO_INDEX[event.key.toLowerCase()];
        if (option !== undefined) {
          event.preventDefault();
          choose(option);
        }
      } else if (event.key === "Enter" || event.key === " ") {
        // Stops a focused button from also being clicked (double advance).
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (finished) {
    return (
      <Results
        deckId={deckId}
        attempt={attempt}
        answers={answers}
        elapsedMs={elapsedMs}
        onRetry={retry}
      />
    );
  }
  if (!current) return null;

  const isLast = index + 1 === attempt.length;
  const correct = answered && chosen === current.correct;

  return (
    <div className="grid gap-6">
      <QuizHeader deckId={deckId} index={index} total={attempt.length} />

      <h1 className="text-xl font-semibold leading-relaxed whitespace-pre-wrap">
        {current.question}
      </h1>

      <div className="grid gap-2" role="group" aria-label="Answer options">
        {current.options.map((option, i) => {
          const isCorrect = answered && i === current.correct;
          const isWrongPick = answered && i === chosen && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-default ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-500/10"
                  : isWrongPick
                    ? "border-destructive bg-destructive/10"
                    : answered
                      ? "opacity-60"
                      : "hover:bg-muted/50"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isWrongPick
                      ? "border-destructive bg-destructive text-white"
                      : "text-muted-foreground"
                }`}
              >
                {isCorrect ? <CheckIcon className="size-3.5" /> : isWrongPick ? <XIcon className="size-3.5" /> : LETTERS[i]}
              </span>
              <span className="pt-0.5 whitespace-pre-wrap">{option}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {answered
          ? correct
            ? "Correct."
            : `Incorrect. The answer is ${LETTERS[current.correct]}: ${current.options[current.correct]}.`
          : ""}
      </p>

      {answered ? (
        <div className="grid gap-4">
          {current.explanation ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">Explanation</p>
              {current.explanation}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-medium ${correct ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
              {correct ? "Correct" : "Incorrect"}
            </p>
            {/* Focused so Enter/Space work right away; the key handler moves on. */}
            <Button onClick={goNext} autoFocus>
              {isLast ? "View results" : "Next question"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Press 1–4 or A–D to answer.</p>
      )}
    </div>
  );
}

function QuizHeader({ deckId, index, total }: { deckId: string; index: number; total: number }) {
  const percent = Math.round((index / total) * 100);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/decks/${deckId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          aria-label="Exit quiz"
        >
          <XIcon /> Exit
        </Link>
        <p className="text-sm text-muted-foreground">
          Question {index + 1} of {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function Results({
  deckId,
  attempt,
  answers,
  elapsedMs,
  onRetry,
}: {
  deckId: string;
  attempt: AttemptQuestion[];
  answers: number[];
  elapsedMs?: number;
  onRetry: () => void;
}) {
  const score = attempt.filter((q, i) => answers[i] === q.correct).length;
  const percent = Math.round((score / attempt.length) * 100);
  const missed = attempt
    .map((q, i) => ({ q, picked: answers[i] }))
    .filter(({ q, picked }) => picked !== q.correct);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <p className="text-sm text-muted-foreground">Quiz complete</p>
        <p className="text-4xl font-semibold">
          {score} / {attempt.length}
        </p>
        <p className="text-sm text-muted-foreground">
          {percent}% correct{elapsedMs !== undefined ? ` · ${formatTime(elapsedMs)}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}>
          <RotateCcwIcon /> Retry quiz
        </Button>
        <Link href={`/decks/${deckId}`} className={buttonVariants({ variant: "outline" })}>
          Back to deck
        </Link>
      </div>

      {missed.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-medium">Missed questions ({missed.length})</h2>
          <ul className="grid gap-3">
            {missed.map(({ q, picked }) => (
              <li key={q.id} className="grid gap-2 rounded-xl border p-4 text-sm">
                <p className="font-medium whitespace-pre-wrap">{q.question}</p>
                <p className="text-destructive">
                  Your answer: {LETTERS[picked]}. {q.options[picked]}
                </p>
                <p className="text-emerald-700 dark:text-emerald-400">
                  Correct answer: {LETTERS[q.correct]}. {q.options[q.correct]}
                </p>
                {q.explanation ? (
                  <p className="rounded-md bg-muted/40 p-3 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {q.explanation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">
          No missed questions.
        </p>
      )}
    </div>
  );
}
