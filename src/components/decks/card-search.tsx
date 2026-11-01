"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { SEARCH_MAX_LENGTH, type SearchScope } from "@/lib/validation";

const DEBOUNCE_MS = 300;

const SCOPES: { value: SearchScope; label: string; placeholder: string }[] = [
  { value: "all", label: "All", placeholder: "Search front and back…" },
  { value: "front", label: "Front only", placeholder: "Search front terms…" },
  { value: "back", label: "Back only", placeholder: "Search definitions/back…" },
];

// Writes the search box into ?q= (debounced) and the scope into ?scope=
// (right away). The server re-renders the card list for the new URL; until it
// arrives, the old list stays up and dims via the data-pending attribute
// (see `group-has-data-pending` in CardList).
export function CardSearch({
  deckId,
  initialQuery,
  initialScope,
}: {
  deckId: string;
  initialQuery: string;
  initialScope: SearchScope;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [scope, setScope] = useState(initialScope);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(text: string, nextScope: SearchScope) {
    const params = new URLSearchParams();
    const q = text.trim();
    // Changing the query or scope also drops ?show=, so results start from the top.
    if (q) params.set("q", q);
    // Kept even without a query, so the choice survives a reload.
    if (nextScope !== "all") params.set("scope", nextScope);
    const search = params.toString();
    const href = search ? `/decks/${deckId}?${search}` : `/decks/${deckId}`;
    // replace: typing doesn't add history entries. A newer navigation
    // supersedes an older one still in flight.
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(next, scope), DEBOUNCE_MS);
  }

  function onScopeChange(next: SearchScope) {
    setScope(next);
    clearTimeout(timer.current); // a pending keystroke is included now
    navigate(value, next);
  }

  const placeholder = SCOPES.find((option) => option.value === scope)?.placeholder;

  return (
    <div className="flex flex-1 gap-2" data-pending={isPending ? "" : undefined}>
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
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
      <select
        aria-label="Search in"
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        value={scope}
        onChange={(event) => onScopeChange(event.target.value as SearchScope)}
      >
        {SCOPES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
