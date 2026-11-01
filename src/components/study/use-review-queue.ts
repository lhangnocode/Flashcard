"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitReview } from "@/app/decks/[deckId]/study/actions";

export type ReviewJob = {
  reviewId: string; // idempotency key: retries reuse it, so the DB applies it once
  cardId: string;
  rating: "again" | "good";
  durationMs: number;
};

export type QueueStatus = "idle" | "syncing" | "retrying" | "stalled";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Saves reviews one at a time, in the order they happened (FIFO).
// - Transient failures retry with exponential backoff (0.5s, 1s, 2s).
// - If the head job still fails, the queue *stalls* instead of skipping it,
//   so later reviews of the same card never get applied out of order.
// - Permanent failures (card deleted, invalid) are dropped and counted.
export function useReviewQueue() {
  const jobs = useRef<ReviewJob[]>([]);
  const running = useRef(false);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [dropped, setDropped] = useState(0);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setStatus("syncing");

    while (jobs.current.length > 0) {
      const job = jobs.current[0];
      let outcome: "saved" | "dropped" | "stalled" = "stalled";

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          setStatus("retrying");
          await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
        try {
          const result = await submitReview(job);
          if (result.ok) {
            outcome = "saved";
            break;
          }
          if (!result.retryable) {
            outcome = "dropped";
            break;
          }
        } catch {
          // Network error reaching the server: retry.
        }
      }

      if (outcome === "stalled") {
        setStatus("stalled");
        running.current = false;
        return; // keep the job at the head; retry() or the next enqueue resumes
      }
      jobs.current.shift();
      if (outcome === "dropped") setDropped((n) => n + 1);
      setPending(jobs.current.length);
      setStatus("syncing");
    }

    setStatus("idle");
    running.current = false;
  }, []);

  const enqueue = useCallback(
    (job: ReviewJob) => {
      jobs.current.push(job);
      setPending(jobs.current.length);
      void run();
    },
    [run],
  );

  const retry = useCallback(() => void run(), [run]);

  // Give up on unsaved reviews (the user chose to).
  const discard = useCallback(() => {
    jobs.current = [];
    setPending(0);
    setStatus("idle");
  }, []);

  // Warn before closing or reloading the tab with unsaved reviews.
  useEffect(() => {
    if (pending === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pending]);

  return { enqueue, retry, discard, pending, status, dropped };
}
