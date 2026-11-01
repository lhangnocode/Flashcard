-- In-deck search. ILIKE does the real matching for Japanese (no spaces, so a
-- whole sentence is one pg_trgm "word" and trigram scores stay low);
-- similarity(front) > 0.2 only adds typo tolerance for Latin text.
create or replace function public.search_deck_cards(
  p_deck_id uuid,
  p_query text,
  p_limit int default 100
)
returns table (id uuid, front text, back text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      btrim(coalesce(p_query, '')) as raw,
      -- Escape LIKE wildcards so "%" and "_" are matched literally
      -- (backslash is the default LIKE escape character).
      replace(replace(replace(btrim(coalesce(p_query, '')),
        '\', '\\'), '%', '\%'), '_', '\_') as pattern
  )
  select c.id, c.front, c.back
  from public.cards c
  cross join q
  where c.deck_id = p_deck_id
    and c.user_id = (select auth.uid())  -- RLS enforces this too
    and q.raw <> ''
    and (
      c.front ilike '%' || q.pattern || '%'
      or c.back ilike '%' || q.pattern || '%'
      or extensions.similarity(c.front, q.raw) > 0.2
    )
  order by
    case
      when lower(c.front) = lower(q.raw)            then 100  -- exact front
      when c.front ilike q.pattern || '%'           then 80   -- front starts with q
      when c.front ilike '%' || q.pattern || '%'    then 60   -- q inside front
      when c.back  ilike '%' || q.pattern || '%'    then 40   -- q inside back
      else 20                                                 -- trigram-only (typo)
    end desc,
    extensions.word_similarity(q.raw, c.back) desc,
    c.created_at desc,
    c.id  -- stable order for cards created together (imports)
  -- Callers can't ask for more than 100 rows.
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

revoke execute on function public.search_deck_cards(uuid, text, int) from public, anon;
grant execute on function public.search_deck_cards(uuid, text, int) to authenticated;
