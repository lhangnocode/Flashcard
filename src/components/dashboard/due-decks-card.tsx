import { PartyPopperIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export type DueDeck = { id: string; title: string; due_cards: number };

// dueDeckCount = every deck with due cards; `decks` = the top few to show.
export function DueDecksCard({ decks, dueDeckCount }: { decks: DueDeck[]; dueDeckCount: number }) {
  if (dueDeckCount === 0) {
    return (
      <section className="flex items-start gap-3 rounded-xl border bg-emerald-50 p-5 dark:bg-emerald-950/30">
        <PartyPopperIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="grid gap-1">
          <h2 className="font-medium">All caught up for today! 🎉</h2>
          <p className="text-sm text-muted-foreground">
            You can review new cards or relax.{" "}
            <Link href="/decks" className="underline underline-offset-4 hover:text-foreground">
              Browse your decks
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-xl border bg-amber-50 p-5 dark:bg-amber-950/30">
      <h2 className="font-medium">
        You have {dueDeckCount} {dueDeckCount === 1 ? "deck" : "decks"} waiting for review today!
      </h2>
      <ul className="grid gap-2">
        {decks.map((deck) => (
          <li
            key={deck.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{deck.title}</p>
              <p className="text-xs text-muted-foreground">
                {deck.due_cards} {deck.due_cards === 1 ? "card" : "cards"} due
              </p>
            </div>
            <Link href={`/decks/${deck.id}/study`} className={buttonVariants({ size: "sm" })}>
              Study now
            </Link>
          </li>
        ))}
      </ul>
      {dueDeckCount > decks.length ? (
        <Link href="/decks" className="text-sm text-muted-foreground underline underline-offset-4">
          See all {dueDeckCount} decks
        </Link>
      ) : null}
    </section>
  );
}
