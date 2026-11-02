import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuizImportDialog } from "@/components/quiz/quiz-import-dialog";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { newSeed } from "@/lib/quiz-attempt";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import type { QuizQuestion } from "@/types/quiz";

// PostgREST returns at most this many rows per request (max_rows).
const PAGE_SIZE = 1000;

// In the (focus) route group: no navbar.
export default function QuizPage(props: PageProps<"/decks/[deckId]/quiz">) {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-muted/50" />}>
        <QuizLoader params={props.params} />
      </Suspense>
    </main>
  );
}

async function QuizLoader({ params }: { params: PageProps<"/decks/[deckId]/quiz">["params"] }) {
  const { deckId } = await params;
  if (!idSchema.safeParse(deckId).success) notFound();
  await requireUser();
  const supabase = await createClient();

  const [deckResult, questions] = await Promise.all([
    supabase.from("decks").select("id, title").eq("id", deckId).maybeSingle(),
    loadQuestions(supabase, deckId),
  ]);
  if (deckResult.error) throw deckResult.error;
  const deck = deckResult.data;
  if (!deck) notFound();

  if (questions.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
        <h1 className="text-lg font-semibold">{deck.title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          No quiz questions available for this deck yet. Import quiz questions to get started.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <QuizImportDialog deckId={deck.id} existingCount={0} variant="default" />
          <Link href={`/decks/${deck.id}`} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeftIcon /> Back to deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      // A different question set (import, replace) starts a new attempt.
      key={`${questions.length}:${questions[0].id}:${questions[questions.length - 1].id}`}
      deckId={deck.id}
      questions={questions}
      // Chosen per request, after request data was read; the browser reuses
      // it, so the shuffled order matches when the page hydrates.
      initialSeed={newSeed()}
    />
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadQuestions(supabase: Supabase, deckId: string) {
  const questions: QuizQuestion[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id, question, options, correct_index, explanation")
      .eq("deck_id", deckId)
      .order("position")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    questions.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return questions;
}
