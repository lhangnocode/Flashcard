"use client";

import { ChevronDownIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { deleteCard } from "@/app/(app)/decks/actions";
import { CardFormDialog, type CardData } from "@/components/decks/card-form-dialog";
import { CardSearch } from "@/components/decks/card-search";
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
            {/* Keyed by the search, so a new search starts with every card collapsed. */}
            <ul key={`${query}|${scope}`} className="divide-y rounded-xl border">
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

  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  // A click that ends a text selection (e.g. copying a term) shouldn't toggle.
  function onContentClick() {
    if (window.getSelection()?.type === "Range") return;
    setExpanded((open) => !open);
  }

  return (
    <li
      className={`flex items-start gap-1 p-3 transition-colors hover:bg-muted/40 ${pending ? "opacity-50" : ""}`}
    >
      {/* Mouse/touch target. Keyboard and screen readers use the chevron
          button; the menu sits beside this area, not inside it, so its clicks
          (which React passes up the component tree even from a portal) never
          toggle the card. */}
      <div className="grid min-w-0 flex-1 cursor-pointer gap-0.5 pr-2" onClick={onContentClick}>
        <p className="font-medium whitespace-pre-wrap">{card.front}</p>
        {expanded ? (
          <div
            id={panelId}
            className="mt-2 rounded-md border bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
          >
            {card.back}
          </div>
        ) : (
          <p id={panelId} className="line-clamp-2 text-sm whitespace-pre-wrap text-muted-foreground">
            {card.back}
          </p>
        )}
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${card.front}`}
        onClick={() => setExpanded((open) => !open)}
      >
        <ChevronDownIcon className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </Button>
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
