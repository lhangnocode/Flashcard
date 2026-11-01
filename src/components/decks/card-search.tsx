"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { SEARCH_MAX_LENGTH } from "@/lib/validation";

const DEBOUNCE_MS = 300;

// Writes the search box into ?q= (debounced). The server re-renders the card
// list for the new URL; until it arrives, the old list stays up and dims via
// the data-pending attribute (see `group-has-data-pending` in CardList).
export function CardSearch({ deckId, initialQuery }: { deckId: string; initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const q = next.trim();
      // Changing the query also drops ?show=, so results start from the top.
      const href = q ? `/decks/${deckId}?q=${encodeURIComponent(q)}` : `/decks/${deckId}`;
      // replace: typing doesn't add history entries. A newer navigation
      // supersedes an older one still in flight.
      startTransition(() => router.replace(href, { scroll: false }));
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative flex-1" data-pending={isPending ? "" : undefined}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search front and back…"
        aria-label="Search cards"
        className="pr-8 pl-8"
        maxLength={SEARCH_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {isPending ? (
        <Loader2Icon
          aria-label="Searching"
          className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      ) : null}
    </div>
  );
}
