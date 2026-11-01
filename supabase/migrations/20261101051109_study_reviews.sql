-- Study reviews: one atomic, idempotent function that logs a review and
-- applies SM-2 to the card. The client only sends what happened (rating,
-- duration); the database decides the new schedule, so it can't be spoofed.

create function public.submit_card_review(
  p_review_id          uuid,
  p_card_id            uuid,
  p_rating             text,
  p_review_duration_ms integer
)
returns table (
  status         text,
  ease_factor    real,
  interval_days  integer,
  repetitions    integer,
  next_review_at timestamptz
)
language plpgsql
security invoker          -- runs as the caller, so RLS applies
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
begin
  -- 1. Validate input.
  if p_rating is null or p_rating not in ('again', 'good') then
    raise exception 'invalid rating: %', p_rating using errcode = '22023';
  end if;
  if p_review_duration_ms is null
     or p_review_duration_ms not between 0 and 3600000 then
    raise exception 'invalid review duration' using errcode = '22023';
  end if;

  -- 2. Lock the card row. Concurrent reviews of the same card wait here,
  --    so each one reads the state the previous one wrote.
  select * into v_card
  from public.cards c
  where c.id = p_card_id and c.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'card not found' using errcode = 'P0002';
  end if;

  -- 3. Idempotency: a retry of an already-applied review is a no-op.
  --    Checked after the lock so two copies of one retry can't both pass.
  if exists (select 1 from public.review_logs r where r.id = p_review_id) then
    return query select v_card.status, v_card.ease_factor, v_card.interval_days,
                        v_card.repetitions, v_card.next_review_at;
    return;
  end if;

  -- 4. SM-2 (two-button variant).
  if p_rating = 'again' then
    -- Lapse: fixed -0.20 ease penalty (floor 1.3), back into learning,
    -- due immediately.
    v_card.ease_factor    := greatest(1.3, v_card.ease_factor - 0.2);
    v_card.repetitions    := 0;
    v_card.interval_days  := 0;
    v_card.status         := 'learning';
    v_card.next_review_at := now();
  else
    -- Good (q = 4): ease unchanged; interval 1 day, then 6, then interval x ease.
    v_card.interval_days := case
      when v_card.repetitions = 0 then 1
      when v_card.repetitions = 1 then 6
      else least(36500, round(v_card.interval_days * v_card.ease_factor)::integer)
    end;
    v_card.repetitions    := v_card.repetitions + 1;
    v_card.status         := 'review';
    v_card.next_review_at := now() + make_interval(days => v_card.interval_days);
  end if;

  -- 5. Log and update in the same transaction.
  insert into public.review_logs (id, card_id, user_id, rating, review_duration_ms)
  values (p_review_id, v_card.id, v_card.user_id, p_rating, p_review_duration_ms);

  update public.cards c
  set status         = v_card.status,
      ease_factor    = v_card.ease_factor,
      interval_days  = v_card.interval_days,
      repetitions    = v_card.repetitions,
      next_review_at = v_card.next_review_at
  where c.id = v_card.id;

  return query select v_card.status, v_card.ease_factor, v_card.interval_days,
                      v_card.repetitions, v_card.next_review_at;
end;
$$;

-- New functions are executable by everyone (PUBLIC) by default.
revoke execute on function public.submit_card_review(uuid, uuid, text, integer)
  from public, anon;
grant execute on function public.submit_card_review(uuid, uuid, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- deck_summaries: "due" now means reviews that are due; new cards are counted
-- separately. New columns can only be appended in CREATE OR REPLACE VIEW.
-- ---------------------------------------------------------------------------
create or replace view public.deck_summaries
with (security_invoker = on)
as
select
  d.id,
  d.user_id,
  d.title,
  d.description,
  d.created_at,
  d.updated_at,
  count(c.id)::int as total_cards,
  count(c.id) filter (
    where c.status <> 'new' and c.next_review_at <= now()
  )::int as due_cards,
  count(c.id) filter (where c.status = 'new')::int as new_cards
from public.decks d
left join public.cards c
  on c.deck_id = d.id and c.user_id = d.user_id
group by d.id;
