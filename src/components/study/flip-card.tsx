"use client";

import { cn } from "@/lib/utils";

export type StudyCard = {
  id: string;
  front: string;
  back: string;
  reading: string | null;
  example: string | null;
  notes: string | null;
};

// 3D flip: both faces are stacked in the same grid cell; the inner element
// rotates 180° on the Y axis and backface-hidden hides whichever face points
// away. Reduced-motion users get an instant swap.
export function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: StudyCard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? "Show front" : "Show answer"}
      className="w-full rounded-2xl text-left outline-none perspective-[1200px] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div
        className={cn(
          "grid transition-transform duration-500 ease-out transform-3d motion-reduce:transition-none",
          flipped && "rotate-y-180",
        )}
      >
        <Face hidden={flipped}>
          <p className="text-center text-3xl font-semibold sm:text-4xl">{card.front}</p>
          <p className="text-center text-xs text-muted-foreground">Space to flip</p>
        </Face>

        <Face hidden={!flipped} back>
          <div className="grid gap-1 text-center">
            <p className="text-xl font-semibold">{card.front}</p>
            {card.reading ? (
              <p className="text-sm text-muted-foreground">{card.reading}</p>
            ) : null}
          </div>
          <p className="text-center text-lg whitespace-pre-line">{card.back}</p>
          {card.example ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
              {card.example}
            </p>
          ) : null}
          {card.notes ? (
            <p className="text-xs text-muted-foreground whitespace-pre-line">{card.notes}</p>
          ) : null}
        </Face>
      </div>
    </button>
  );
}

function Face({
  hidden,
  back,
  children,
}: {
  hidden: boolean;
  back?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      // Screen readers should only read the face that's showing.
      aria-hidden={hidden}
      className={cn(
        "col-start-1 row-start-1 flex min-h-64 flex-col justify-center gap-4 rounded-2xl border bg-card p-6 shadow-sm backface-hidden",
        back && "rotate-y-180",
      )}
    >
      {children}
    </div>
  );
}
