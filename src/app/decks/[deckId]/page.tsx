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
import { idSchema } from "@/lib/validation";

export default function DeckPage(props: PageProps<"/decks/[deckId]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      <Link
        href="/decks"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All decks
      </Link>
      {/* params is request data for this dynamic route, so it's read inside Suspense. */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/50" />}>
        <DeckView params={props.params} />
      </Suspense>
    </main>
  );
}

async function DeckView({ params }: { params: PageProps<"/decks/[deckId]">["params"] }) {
  const { deckId } = await params;
  // A malformed ID would make Postgres throw (22P02); treat it as not found.
  if (!idSchema.safeParse(deckId).success) notFound();

  await requireUser();
  const supabase = await createClient();
  const [deckResult, cardsResult] = await Promise.all([
    supabase
      .from("decks")
      .select("id, title, description")
      .eq("id", deckId)
      .maybeSingle(),
    supabase
      .from("cards")
      .select("id, front, back")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false }),
  ]);

  if (deckResult.error) throw deckResult.error;
  if (cardsResult.error) throw cardsResult.error;
  // Missing, or owned by someone else (RLS hides it): same answer either way.
  const deck = deckResult.data;
  if (!deck) notFound();
  const cards = cardsResult.data;

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
            <DeleteDeckButton deckId={deck.id} title={deck.title} cardCount={cards.length} />
          </div>
        </div>
        <div>
          <Link href={`/decks/${deck.id}/study`} className={buttonVariants()}>
            Study deck
          </Link>
        </div>
      </header>
      <CardList deckId={deck.id} cards={cards} />
    </>
  );
}
