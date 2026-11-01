"use client";

import { EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteCard } from "@/app/decks/actions";
import { CardFormDialog, type CardData } from "@/components/decks/card-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

// Which dialog is open: none, "add", or editing a specific card.
type DialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; card: CardData };

export function CardList({ deckId, cards }: { deckId: string; cards: CardData[] }) {
  const [filter, setFilter] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  // Quick in-deck filter. Global fuzzy search is a separate, later feature.
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      [card.front, card.back].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [cards, filter]);

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Filter cards…"
          aria-label="Filter cards"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <Button onClick={() => setDialog({ mode: "add" })}>
          <PlusIcon /> Add card
        </Button>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cards yet. Add your first one.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cards match “{filter}”.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {visible.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onEdit={() => setDialog({ mode: "edit", card })}
            />
          ))}
        </ul>
      )}

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
