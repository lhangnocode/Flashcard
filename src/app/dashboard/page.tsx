import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityHeatmap, type HeatmapDay } from "@/components/dashboard/activity-heatmap";
import { DueDecksCard } from "@/components/dashboard/due-decks-card";
import { StatCards } from "@/components/dashboard/stat-cards";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/time-zone";

export const metadata: Metadata = { title: "Dashboard" };

const TOP_DUE_DECKS = 3;

export default function DashboardPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {/* Reads cookies (user, time zone), so it streams in behind Suspense. */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadStats(supabase: Supabase, timeZone: string) {
  let result = await supabase.rpc("get_dashboard_stats", { p_time_zone: timeZone });
  // Postgres doesn't know this zone (22023): fall back to UTC rather than fail.
  if (result.error?.code === "22023" && timeZone !== "UTC") {
    result = await supabase.rpc("get_dashboard_stats", { p_time_zone: "UTC" });
  }
  if (result.error) throw result.error;
  const stats = result.data[0];
  if (!stats) throw new Error("get_dashboard_stats returned no row");
  return stats;
}

async function DashboardContent() {
  await requireUser();
  const [supabase, timeZone] = await Promise.all([createClient(), getTimeZone()]);

  const [stats, dueResult, deckCount, cardCount] = await Promise.all([
    loadStats(supabase, timeZone),
    supabase
      .from("deck_summaries")
      .select("id, title, due_cards", { count: "exact" })
      .gt("due_cards", 0)
      .order("due_cards", { ascending: false })
      .limit(TOP_DUE_DECKS),
    supabase.from("decks").select("id", { count: "exact", head: true }),
    supabase.from("cards").select("id", { count: "exact", head: true }),
  ]);
  if (dueResult.error) throw dueResult.error;
  if (deckCount.error) throw deckCount.error;
  if (cardCount.error) throw cardCount.error;

  // View columns are typed nullable; rows with due_cards > 0 always have them.
  const dueDecks = dueResult.data.flatMap((deck) =>
    deck.id && deck.title ? [{ id: deck.id, title: deck.title, due_cards: deck.due_cards ?? 0 }] : [],
  );
  const totalDecks = deckCount.count ?? 0;
  const totalCards = cardCount.count ?? 0;

  return (
    <>
      <StatCards stats={stats} totalCards={totalCards} />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <DueDecksCard decks={dueDecks} dueDeckCount={dueResult.count ?? 0} />
        <ActivityHeatmap days={stats.heatmap as HeatmapDay[]} />
      </div>
      <p className="text-xs text-muted-foreground">
        {totalDecks} {totalDecks === 1 ? "deck" : "decks"} · {totalCards}{" "}
        {totalCards === 1 ? "card" : "cards"} · times in {timeZone}
      </p>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
}
