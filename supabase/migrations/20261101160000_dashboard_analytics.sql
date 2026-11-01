-- Dashboard stats for the signed-in user. All "day" and "week" boundaries are
-- computed in the caller's time zone: the database runs on UTC, so without
-- this a 6 a.m. review in UTC+7 would count as the previous day.
create or replace function public.get_dashboard_stats(p_time_zone text default 'UTC')
returns table (
  current_streak     int,
  longest_streak     int,
  study_time_week_ms bigint,
  reviews_today      int,
  mastered_cards     int,
  heatmap            jsonb  -- [{ "date": "YYYY-MM-DD", "count": n }], oldest first
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date;
  v_today_start timestamptz;
  v_week_start timestamptz;
  v_heat_start date;
begin
  -- Only real zone names (e.g. 'Asia/Ho_Chi_Minh'). Postgres would also
  -- accept POSIX strings like 'UTC+7', whose sign is inverted.
  if p_time_zone is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone: %', p_time_zone using errcode = '22023';
  end if;

  v_today       := (now() at time zone p_time_zone)::date;
  v_today_start := v_today::timestamp at time zone p_time_zone;  -- local midnight, as an instant
  v_week_start  := date_trunc('week', v_today)::timestamp at time zone p_time_zone;  -- local Monday 00:00
  -- 13 week-columns: this week's Monday minus 12 weeks.
  v_heat_start  := date_trunc('week', v_today)::date - 84;

  -- Streaks (gaps and islands): for consecutive days, day - row_number is
  -- constant, so grouping by it yields one row per unbroken run.
  with days as (
    select distinct (r.reviewed_at at time zone p_time_zone)::date as d
    from public.review_logs r
    where r.user_id = v_uid
  ),
  runs as (
    select d, d - (row_number() over (order by d))::int as grp
    from days
  ),
  islands as (
    select max(d) as end_d, count(*)::int as len
    from runs
    group by grp
  )
  select
    coalesce(max(len) filter (where end_d >= v_today - 1), 0),  -- run ending today or yesterday
    coalesce(max(len), 0)
  into current_streak, longest_streak
  from islands;

  select
    coalesce(sum(r.review_duration_ms) filter (where r.reviewed_at >= v_week_start), 0)::bigint,
    count(*) filter (where r.reviewed_at >= v_today_start)::int
  into study_time_week_ms, reviews_today
  from public.review_logs r
  where r.user_id = v_uid
    and r.reviewed_at >= least(v_week_start, v_today_start);

  select count(*)::int
  into mastered_cards
  from public.cards c
  where c.user_id = v_uid
    and c.status = 'review'
    and c.interval_days >= 7;

  -- One entry per local date from v_heat_start to today, including empty days.
  select coalesce(
           jsonb_agg(
             jsonb_build_object('date', to_char(g.d, 'YYYY-MM-DD'), 'count', coalesce(c.n, 0))
             order by g.d),
           '[]'::jsonb)
  into heatmap
  from (
    select s::date as d
    from generate_series(v_heat_start::timestamp, v_today::timestamp, interval '1 day') as s
  ) g
  left join (
    select (r.reviewed_at at time zone p_time_zone)::date as d, count(*)::int as n
    from public.review_logs r
    where r.user_id = v_uid
      and r.reviewed_at >= v_heat_start::timestamp at time zone p_time_zone
    group by 1
  ) c on c.d = g.d;

  return next;
end;
$$;

revoke execute on function public.get_dashboard_stats(text) from public, anon;
grant execute on function public.get_dashboard_stats(text) to authenticated;
