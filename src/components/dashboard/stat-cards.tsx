import { ClockIcon, FlameIcon, GraduationCapIcon, ListChecksIcon } from "lucide-react";

export type DashboardStats = {
  current_streak: number;
  longest_streak: number;
  study_time_week_ms: number;
  reviews_today: number;
  mastered_cards: number;
};

// 3_725_000 ms → "1h 2m"
function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function StatCards({ stats, totalCards }: { stats: DashboardStats; totalCards: number }) {
  const masteredPct = totalCards > 0 ? Math.round((stats.mastered_cards / totalCards) * 100) : 0;

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<FlameIcon className="text-orange-500" />}
        label="Current streak"
        value={plural(stats.current_streak, "day", "days")}
        detail={`Best: ${plural(stats.longest_streak, "day", "days")}`}
      />
      <Stat
        icon={<GraduationCapIcon className="text-emerald-600 dark:text-emerald-400" />}
        label="Mastered"
        value={stats.mastered_cards.toLocaleString("en")}
        detail={`${masteredPct}% of ${plural(totalCards, "card", "cards")} · interval ≥ 7 days`}
      />
      <Stat
        icon={<ClockIcon className="text-sky-600 dark:text-sky-400" />}
        label="Time this week"
        value={formatDuration(stats.study_time_week_ms)}
        detail="from review logs"
      />
      <Stat
        icon={<ListChecksIcon className="text-violet-600 dark:text-violet-400" />}
        label="Reviews today"
        value={stats.reviews_today.toLocaleString("en")}
        detail={stats.reviews_today > 0 ? "keep it going" : "none yet today"}
      />
    </dl>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="grid content-start gap-1 rounded-xl border p-4 [&_svg]:size-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{detail}</dd>
    </div>
  );
}
