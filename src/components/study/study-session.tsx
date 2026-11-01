"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlipCard, type StudyCard } from "@/components/study/flip-card";
import { useReviewQueue } from "@/components/study/use-review-queue";
import { Button, buttonVariants } from "@/components/ui/button";

const MAX_DURATION_MS = 3_600_000;

type Rating = "again" | "good";

export function StudySession({
  deckId,
  deckTitle,
  cards,
  batchFull,
}: {
  deckId: string;
  deckTitle: string;
  cards: StudyCard[];
  batchFull: boolean; // the batch hit the cap, so there may be more to study
}) {
  const router = useRouter();
  const reviews = useReviewQueue();

  // In-session queue of card IDs; the head is the current card.
  // "Again" moves a card to the back until it's answered "Good".
  const [queue, setQueue] = useState(() => cards.map((card) => card.id));
  const [flipped, setFlipped] = useState(false);
  const [ended, setEnded] = useState(false);
  // First answer per card (true = remembered on first try).
  const [firstTry, setFirstTry] = useState<Map<string, boolean>>(() => new Map());
  const [presses, setPresses] = useState(0);
  // Increments every time a card is shown, even if it's the same card again.
  const [step, setStep] = useState(0);
  const shownAt = useRef(0);

  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const current = ended ? undefined : cardsById.get(queue[0] ?? "");
  const finished = !current;

  // Start the review timer whenever a card is shown.
  useEffect(() => {
    shownAt.current = Date.now();
  }, [step]);

  const answer = useCallback(
    (rating: Rating) => {
      if (!current || !flipped) return;
      const durationMs = Math.min(Date.now() - shownAt.current, MAX_DURATION_MS);
      reviews.enqueue({
        reviewId: crypto.randomUUID(),
        cardId: current.id,
        rating,
        durationMs,
      });
      setFirstTry((prev) =>
        prev.has(current.id) ? prev : new Map(prev).set(current.id, rating === "good"),
      );
      setPresses((n) => n + 1);
      setQueue(([head, ...rest]) => (rating === "again" ? [...rest, head] : rest));
      setFlipped(false);
      setStep((n) => n + 1);
    },
    [current, flipped, reviews],
  );

  // Keyboard: Space flips, 1 = Again, 2 = Good (only after flipping).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (finished) return;

      if (event.code === "Space") {
        event.preventDefault(); // don't scroll, and don't double-trigger focused buttons
        setFlipped((f) => !f);
      } else if (event.key === "1") {
        answer("again");
      } else if (event.key === "2") {
        answer("good");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, finished]);

  if (cards.length === 0) {
    return (
      <div className="grid justify-items-start gap-4">
        <h1 className="text-2xl font-semibold">Nothing to study</h1>
        <p className="text-sm text-muted-foreground">
          No cards in “{deckTitle}” are due right now.
        </p>
        <Link href={`/decks/${deckId}`} className={buttonVariants({ variant: "outline" })}>
          Back to deck
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <Summary
        deckId={deckId}
        firstTry={firstTry}
        presses={presses}
        unseen={ended ? queue.filter((id) => !firstTry.has(id)).length : 0}
        reviews={reviews}
        batchFull={batchFull && !ended}
        onNextBatch={() => router.refresh()}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span className="truncate">{deckTitle}</span>
        <div className="flex items-center gap-3">
          <SyncBadge status={reviews.status} pending={reviews.pending} />
          <span>{queue.length} left</span>
          <Button variant="ghost" size="sm" onClick={() => setEnded(true)}>
            End session
          </Button>
        </div>
      </div>

      <FlipCard
        key={step}
        card={current}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => answer("again")}>
            Forgot <kbd className="ml-1 text-xs text-muted-foreground">1</kbd>
          </Button>
          <Button size="lg" onClick={() => answer("good")}>
            Remembered <kbd className="ml-1 text-xs opacity-70">2</kbd>
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="lg" onClick={() => setFlipped(true)}>
          Show answer <kbd className="ml-1 text-xs text-muted-foreground">Space</kbd>
        </Button>
      )}
    </div>
  );
}

function SyncBadge({ status, pending }: { status: string; pending: number }) {
  if (status === "retrying") {
    return <span className="text-amber-600">Retrying save…</span>;
  }
  if (status === "stalled") {
    return (
      <span role="status" className="text-destructive">
        {pending} unsaved
      </span>
    );
  }
  return null;
}

function Summary({
  deckId,
  firstTry,
  presses,
  unseen,
  reviews,
  batchFull,
  onNextBatch,
}: {
  deckId: string;
  firstTry: Map<string, boolean>;
  presses: number;
  unseen: number;
  reviews: ReturnType<typeof useReviewQueue>;
  batchFull: boolean;
  onNextBatch: () => void;
}) {
  const unique = firstTry.size;
  const remembered = [...firstTry.values()].filter(Boolean).length;
  const rate = unique > 0 ? Math.round((remembered / unique) * 100) : 0;
  const synced = reviews.pending === 0;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Session complete</h1>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Cards" value={unique} />
        <Stat label="First-try recall" value={`${rate}%`} />
        <Stat label="Answers" value={presses} />
      </dl>
      {unseen > 0 ? (
        <p className="text-sm text-muted-foreground">
          Ended early: {unseen} {unseen === 1 ? "card" : "cards"} not reached.
        </p>
      ) : null}

      {reviews.status === "stalled" ? (
        <div role="alert" className="grid gap-3 rounded-xl border border-destructive/40 p-4">
          <p className="text-sm">
            {reviews.pending} {reviews.pending === 1 ? "review" : "reviews"} couldn’t be
            saved. Check your connection and retry.
          </p>
          <div className="flex gap-2">
            <Button onClick={reviews.retry}>Retry</Button>
            <Button variant="outline" onClick={reviews.discard}>
              Discard unsaved reviews
            </Button>
          </div>
        </div>
      ) : !synced ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saving {reviews.pending} {reviews.pending === 1 ? "review" : "reviews"}…
        </p>
      ) : null}
      {reviews.dropped > 0 ? (
        <p className="text-xs text-muted-foreground">
          {reviews.dropped} {reviews.dropped === 1 ? "review was" : "reviews were"} skipped
          because the card no longer exists.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {batchFull ? (
          <Button disabled={!synced} onClick={onNextBatch}>
            Study next batch
          </Button>
        ) : null}
        {synced ? (
          <Link href={`/decks/${deckId}`} className={buttonVariants({ variant: "outline" })}>
            Back to deck
          </Link>
        ) : (
          <Button variant="outline" disabled>
            Back to deck
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1 rounded-xl border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
