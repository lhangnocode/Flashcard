-- Cards are now just front + back. Readings, examples and notes go into
-- `back` as multiline text.
-- Dropping a column also drops indexes on it; the explicit drops document
-- which trigram indexes go away (front/back keep theirs for search).
drop index if exists public.cards_reading_trgm_idx;
drop index if exists public.cards_example_trgm_idx;

alter table public.cards
  drop column reading,
  drop column example,
  drop column notes;
