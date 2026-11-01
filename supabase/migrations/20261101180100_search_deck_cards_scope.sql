-- Search scope: 'all' (front and back), 'front' or 'back'.
-- Adding a parameter creates a second function rather than replacing the old
-- one, and a 3-argument call would then match both; drop the old one first.
drop function if exists public.search_deck_cards(uuid, text, int);

create function public.search_deck_cards(
  p_deck_id uuid,
  p_query text,
  p_limit int default 100,
  p_scope text default 'all'
)
returns table (id uuid, front text, back text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_raw text := btrim(coalesce(p_query, ''));
  -- Escape LIKE wildcards so "%" and "_" are matched literally
  -- (backslash is the default LIKE escape character).
  v_pattern text := replace(replace(replace(btrim(coalesce(p_query, '')),
    '\', '\\'), '%', '\%'), '_', '\_');
begin
  if p_scope is null or p_scope not in ('all', 'front', 'back') then
    raise exception 'invalid search scope: %', p_scope using errcode = '22023';
  end if;
  if v_raw = '' then
    return;
  end if;

  return query
  select c.id, c.front, c.back
  from public.cards c
  where c.deck_id = p_deck_id
    and c.user_id = (select auth.uid())  -- RLS enforces this too
    and (
      -- Front: substring, plus trigram typo tolerance for Latin text.
      (p_scope in ('all', 'front') and (
        c.front ilike '%' || v_pattern || '%'
        or extensions.similarity(c.front, v_raw) > 0.2))
      -- Back: substring only.
      or (p_scope in ('all', 'back') and c.back ilike '%' || v_pattern || '%')
    )
  order by
    case
      when p_scope = 'back'                          then 0    -- no tiers
      when lower(c.front) = lower(v_raw)             then 100  -- exact front
      when c.front ilike v_pattern || '%'            then 80   -- front starts with q
      when c.front ilike '%' || v_pattern || '%'     then 60   -- q inside front
      when p_scope = 'all'
        and c.back ilike '%' || v_pattern || '%'     then 40   -- q inside back
      else 20                                                  -- trigram-only (typo)
    end desc,
    case
      when p_scope = 'front' then extensions.similarity(c.front, v_raw)
      else extensions.word_similarity(v_raw, c.back)
    end desc,
    c.position,  -- then deck order
    c.id
  -- Callers can't ask for more than 100 rows.
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
end;
$$;

revoke execute on function public.search_deck_cards(uuid, text, int, text) from public, anon;
grant execute on function public.search_deck_cards(uuid, text, int, text) to authenticated;
