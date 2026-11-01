import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardList } from "@/components/decks/card-list";
import { DeckFormDialog } from "@/components/decks/deck-form-dialog";
import { DeleteDeckButton } from "@/components/decks/delete-deck-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CARD_PAGE_SIZE,
  idSchema,
  parseSearchQuery,
  parseSearchScope,
  parseShowCount,
  SEARCH_RESULT_LIMIT,
  type SearchScope,
} from "@/lib/validation";

// PostgREST returns at most this many rows per request (max_rows in
// supabase/config.toml), so longer lists are read in pages.
const PAGE_SIZE = 1000;

type Props = PageProps<"/decks/[deckId]">;

export default function DeckPage(props: Props) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      <Link
        href="/decks"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All decks
      </Link>
      {/* params and searchParams are request data, so they're read inside Suspense. */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/50" />}>
        <DeckView params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function DeckView({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ deckId }, search] = await Promise.all([params, searchParams]);
  // A malformed ID would make Postgres throw (22P02); treat it as not found.
  if (!idSchema.safeParse(deckId).success) notFound();
  const query = parseSearchQuery(search.q);
  const scope = parseSearchScope(search.scope);
  const show = parseShowCount(search.show);

  await requireUser();
  const supabase = await createClient();
  const [deckResult, countResult, cards] = await Promise.all([
    supabase.from("decks").select("id, title, description").eq("id", deckId).maybeSingle(),
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("deck_id", deckId),
    query ? searchCards(supabase, deckId, query, scope) : listCards(supabase, deckId, show + 1),
  ]);

  if (deckResult.error) throw deckResult.error;
  if (countResult.error) throw countResult.error;
  // Missing, or owned by someone else (RLS hides it): same answer either way.
  const deck = deckResult.data;
  if (!deck) notFound();
  const totalCards = countResult.count ?? 0;

  // Without a search we asked for one extra card to learn whether there are more.
  const hasMore = !query && cards.length > show;

  return (
    <>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold">{deck.title}</h1>
            {deck.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {deck.description}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <DeckFormDialog
              deck={deck}
              trigger={
                <Button variant="outline">
                  <PencilIcon /> Edit
                </Button>
              }
            />
            <DeleteDeckButton deckId={deck.id} title={deck.title} cardCount={totalCards} />
          </div>
        </div>
        <div>
          <Link href={`/decks/${deck.id}/study`} className={buttonVariants()}>
            Study deck
          </Link>
        </div>
      </header>
      <CardList
        deckId={deck.id}
        cards={hasMore ? cards.slice(0, show) : cards}
        totalCards={totalCards}
        query={query}
        scope={scope}
        searchCapped={!!query && cards.length >= SEARCH_RESULT_LIMIT}
        nextShow={hasMore ? show + CARD_PAGE_SIZE : null}
      />
    </>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function searchCards(
  supabase: Supabase,
  deckId: string,
  query: string,
  scope: SearchScope,
) {
  const { data, error } = await supabase.rpc("search_deck_cards", {
    p_deck_id: deckId,
    p_query: query,
    p_limit: SEARCH_RESULT_LIMIT,
    p_scope: scope,
  });
  if (error) throw error;
  return data;
}

// In deck order (insert/import order), up to `limit` cards, in PAGE_SIZE requests.
async function listCards(supabase: Supabase, deckId: string, limit: number) {
  const cards: { id: string; front: string; back: string }[] = [];
  while (cards.length < limit) {
    const from = cards.length;
    const to = Math.min(limit, from + PAGE_SIZE) - 1;
    const { data, error } = await supabase
      .from("cards")
      .select("id, front, back")
      .eq("deck_id", deckId)
      .order("position", { ascending: true })
      .order("id")
      .range(from, to);
    if (error) throw error;
    cards.push(...data);
    if (data.length < to - from + 1) break;
  }
  return cards;
}
