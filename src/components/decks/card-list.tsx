"use client";

import { EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCard } from "@/app/decks/actions";
import { CardFormDialog, type CardData } from "@/components/decks/card-form-dialog";
import { CardSearch } from "@/components/decks/card-search";
import { QuizletImportDialog } from "@/components/decks/quizlet-import-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SEARCH_RESULT_LIMIT, type SearchScope } from "@/lib/validation";

const SCOPE_LABEL: Record<SearchScope, string> = {
  all: "",
  front: " on the front",
  back: " on the back",
};

// Which dialog is open: none, "add", or editing a specific card.
type DialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; card: CardData };

export function CardList({
  deckId,
  cards,
  totalCards,
  query,
  scope,
  searchCapped,
  nextShow,
}: {
  deckId: string;
  cards: CardData[];
  totalCards: number; // all cards in the deck, not just the ones shown
  query: string; // "" = no search
  scope: SearchScope;
  searchCapped: boolean; // search hit the result limit
  nextShow: number | null; // ?show= value for "Load more", or null if none
}) {
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  return (
    // `group`: the search box sets data-pending while a new list loads,
    // and the list dims through group-has-data-pending.
    <section className="group grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CardSearch deckId={deckId} initialQuery={query} initialScope={scope} />
        <Button onClick={() => setDialog({ mode: "add" })}>
          <PlusIcon /> Add card
        </Button>
        <QuizletImportDialog deckId={deckId} />
      </div>

      <div className="grid gap-3 transition-opacity group-has-data-pending:opacity-50">
        {totalCards === 0 ? (
          <p className="text-sm text-muted-foreground">No cards yet. Add your first one.</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards match “{query}”{SCOPE_LABEL[scope]}.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {query
                ? searchCapped
                  ? `Showing top ${SEARCH_RESULT_LIMIT} matches`
                  : `${cards.length} ${cards.length === 1 ? "match" : "matches"}`
                : `Showing ${cards.length} of ${totalCards} ${totalCards === 1 ? "card" : "cards"}`}
            </p>
            <ul className="divide-y rounded-xl border">
              {cards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onEdit={() => setDialog({ mode: "edit", card })}
                />
              ))}
            </ul>
          </>
        )}
        {nextShow ? (
          <Link
            href={`/decks/${deckId}?show=${nextShow}${scope === "all" ? "" : `&scope=${scope}`}`}
            replace
            scroll={false}
            className={buttonVariants({ variant: "outline", className: "justify-self-center" })}
          >
            Load more
          </Link>
        ) : null}
      </div>

      <CardFormDialog
        // Remount per card so the form shows that card's values.
        key={dialog.mode === "edit" ? dialog.card.id : "add"}
        deckId={deckId}
        card={dialog.mode === "edit" ? dialog.card : undefined}
        open={dialog.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ mode: "closed" });
        }}
      />
    </section>
  );
}

function CardRow({ card, onEdit }: { card: CardData; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className={`flex items-start gap-3 p-3 ${pending ? "opacity-50" : ""}`}>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="font-medium">
          {card.front}
        </p>
        <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {card.back}
        </p>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${card.front}`} />}
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={pending} onClick={remove}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
