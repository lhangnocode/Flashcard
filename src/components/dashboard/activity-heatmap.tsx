import { cn } from "@/lib/utils";

export type HeatmapDay = { date: string; count: number };

const WEEKS = 13;
// Fixed thresholds (lower bounds) so colors stay comparable over time.
const LEVELS = [
  { min: 0, className: "bg-zinc-100 dark:bg-zinc-800" },
  { min: 1, className: "bg-emerald-200 dark:bg-emerald-900" },
  { min: 10, className: "bg-emerald-300 dark:bg-emerald-700" },
  { min: 30, className: "bg-emerald-500 dark:bg-emerald-600" },
  { min: 60, className: "bg-emerald-600 dark:bg-emerald-500" },
];
const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

// Dates are plain "YYYY-MM-DD" days, so format them in UTC to avoid shifting.
const dayFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

function levelFor(count: number) {
  return LEVELS.findLast((level) => count >= level.min) ?? LEVELS[0];
}

// `days` starts on a Monday and ends today (from get_dashboard_stats).
// Columns are weeks, rows are weekdays; days after today stay empty.
export function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  const cells: (HeatmapDay | null)[] = [...days];
  while (cells.length < WEEKS * 7) cells.push(null);
  const total = days.reduce((sum, day) => sum + day.count, 0);

  // A month label above the first week-column that starts in that month.
  const monthLabels = Array.from({ length: WEEKS }, (_, week) => {
    const first = cells[week * 7];
    if (!first) return "";
    const month = monthFormat.format(toDate(first.date));
    const previous = week > 0 ? cells[(week - 1) * 7] : null;
    return previous && monthFormat.format(toDate(previous.date)) === month ? "" : month;
  });

  return (
    <section className="grid gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Activity</h2>
        <p className="text-xs text-muted-foreground">
          {total.toLocaleString("en")} {total === 1 ? "review" : "reviews"} in the last {WEEKS}{" "}
          weeks
        </p>
      </div>

      <div className="overflow-x-auto">
        {/* Fixed-width week columns shared (via subgrid) by month labels and cells.
            Labels may overflow into the next column; they're at most monthly. */}
        <div className="grid w-fit grid-cols-[auto_repeat(13,0.75rem)] gap-1 text-[10px] text-muted-foreground sm:grid-cols-[auto_repeat(13,0.875rem)]">
          <span />
          {monthLabels.map((label, week) => (
            <span key={week} className="h-3 leading-3 whitespace-nowrap">
              {label}
            </span>
          ))}

          {/* Weekday labels column, then 13 columns filled top-to-bottom. */}
          <div className="grid grid-rows-7 gap-1 pr-1">
            {ROW_LABELS.map((label, row) => (
              <span key={row} className="h-3 leading-3 sm:h-3.5 sm:leading-3.5">
                {label}
              </span>
            ))}
          </div>
          <div className="col-span-13 grid grid-flow-col grid-cols-subgrid grid-rows-7">
            {cells.map((day, index) =>
              day ? (
                <div
                  key={day.date}
                  role="img"
                  title={`${dayFormat.format(toDate(day.date))}: ${day.count} ${day.count === 1 ? "review" : "reviews"}`}
                  aria-label={`${dayFormat.format(toDate(day.date))}: ${day.count} ${day.count === 1 ? "review" : "reviews"}`}
                  className={cn("size-3 rounded-[3px] sm:size-3.5", levelFor(day.count).className)}
                />
              ) : (
                <div key={`empty-${index}`} aria-hidden className="size-3 sm:size-3.5" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground" aria-hidden>
        Less
        {LEVELS.map((level) => (
          <span key={level.min} className={cn("size-3 rounded-[3px]", level.className)} />
        ))}
        More
      </div>
    </section>
  );
}
