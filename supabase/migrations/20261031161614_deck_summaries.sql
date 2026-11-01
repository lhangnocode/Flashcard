-- One row per deck with card totals, for the decks overview page.
-- security_invoker = on: the view runs with the *caller's* permissions, so the
-- RLS policies on decks and cards still apply. Without it, a view runs as its
-- owner and would bypass RLS.
create view public.deck_summaries
with (security_invoker = on)
as
select
  d.id,
  d.user_id,
  d.title,
  d.description,
  d.created_at,
  d.updated_at,
  count(c.id)::int                                        as total_cards,
  count(c.id) filter (where c.next_review_at <= now())::int as due_cards
from public.decks d
left join public.cards c
  on c.deck_id = d.id and c.user_id = d.user_id
group by d.id;

revoke all on public.deck_summaries from anon, authenticated;
grant select on public.deck_summaries to authenticated;
