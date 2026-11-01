"use client";

import { cn } from "@/lib/utils";

export type StudyCard = {
  id: string;
  front: string;
  back: string;
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
          <div className="mx-auto flex h-full w-full max-w-lg flex-col items-center justify-center p-8 text-center">
            <p className="mb-3 text-base font-medium text-muted-foreground">{card.front}</p>
            <div aria-hidden className="mb-4 w-16 border-t border-border" />
            {/* w-fit centers a short back as one line; a multiline back keeps
                its lines left-aligned inside the centered box. */}
            <p className="w-fit max-w-full text-left text-2xl leading-relaxed font-semibold break-words whitespace-pre-wrap text-foreground">
              {card.back}
            </p>
          </div>
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
        "col-start-1 row-start-1 flex min-h-64 flex-col justify-center gap-4 rounded-2xl border bg-card shadow-sm backface-hidden",
        // The back face pads its own centered container.
        !back && "p-6",
        back && "rotate-y-180",
      )}
    >
      {children}
    </div>
  );
}
