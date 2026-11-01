import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StudySession } from "@/components/study/study-session";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

const BATCH_SIZE = 30;
const CARD_FIELDS = "id, front, back";

export default function StudyPage(props: PageProps<"/decks/[deckId]/study">) {
  return (
    // No navbar here: this page is in the (focus) route group.
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/50" />}>
        <StudyLoader params={props.params} />
      </Suspense>
    </main>
  );
}

async function StudyLoader({
  params,
}: {
  params: PageProps<"/decks/[deckId]/study">["params"];
}) {
  const { deckId } = await params;
  if (!idSchema.safeParse(deckId).success) notFound();

  await requireUser();
  const supabase = await createClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", deckId)
    .maybeSingle();
  if (deckError) throw deckError;
  if (!deck) notFound();

  // Batch = due reviews first (most overdue first), then new cards to fill.
  // Two queries because PostgREST can't ORDER BY a CASE expression.
  const { data: due, error: dueError } = await supabase
    .from("cards")
    .select(CARD_FIELDS)
    .eq("deck_id", deckId)
    .neq("status", "new")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (dueError) throw dueError;

  let fresh: typeof due = [];
  if (due.length < BATCH_SIZE) {
    const { data, error } = await supabase
      .from("cards")
      .select(CARD_FIELDS)
      .eq("deck_id", deckId)
      .eq("status", "new")
      // Deck order, so new cards come up as they were imported (1.1, 1.2, …).
      .order("position", { ascending: true })
      .order("id")
      .limit(BATCH_SIZE - due.length);
    if (error) throw error;
    fresh = data;
  }

  const cards = [...due, ...fresh];

  return (
    <StudySession
      // A new key per request, so "Study next batch" (router.refresh())
      // starts a fresh session even if some cards repeat.
      key={crypto.randomUUID()}
      deckId={deck.id}
      deckTitle={deck.title}
      cards={cards}
      batchFull={cards.length === BATCH_SIZE}
    />
  );
}
