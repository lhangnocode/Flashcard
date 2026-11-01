import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function DecksPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      {/* Static shell: renders instantly. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <DeckFormDialog
          trigger={
            <Button>
              <PlusIcon /> New deck
            </Button>
          }
        />
      </div>
      {/* User data: streams in per request. */}
      <Suspense fallback={<DeckListSkeleton />}>
        <DeckList />
      </Suspense>
    </main>
  );
}

async function DeckList() {
  await requireUser();
  const supabase = await createClient();
  // RLS (via the security_invoker view) limits this to the user's decks.
  const { data: decks, error } = await supabase
    .from("deck_summaries")
    .select("id, title, description, total_cards, due_cards, new_cards")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (decks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No decks yet. Create one to start adding cards.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {decks.map((deck) => {
        // View columns are typed nullable; COUNT never returns NULL, but be explicit.
        const total = deck.total_cards ?? 0;
        const due = deck.due_cards ?? 0;
        const fresh = deck.new_cards ?? 0;
        return (
        <li key={deck.id}>
          <Link
            href={`/decks/${deck.id}`}
            className="grid h-full gap-1 rounded-xl border p-4 transition-colors hover:bg-muted"
          >
            <span className="font-medium">{deck.title}</span>
            {deck.description ? (
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {deck.description}
              </span>
            ) : null}
            <span className="mt-2 text-xs text-muted-foreground">
              {total} {total === 1 ? "card" : "cards"} ·{" "}
              <span className={due > 0 ? "font-medium text-foreground" : ""}>
                {due} due
              </span>{" "}
              · {fresh} new
            </span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}

function DeckListSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="h-24 animate-pulse rounded-xl border bg-muted/50" />
      ))}
    </ul>
  );
}
