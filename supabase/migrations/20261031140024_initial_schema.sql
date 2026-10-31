-- Initial schema: decks, cards (with SRS state), tags, card_tags, review_logs.
-- Ownership: every table carries user_id, and composite foreign keys
-- (id, user_id) guarantee related rows always belong to the same user.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- decks
-- ---------------------------------------------------------------------------
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cards (content + current SRS state)
-- ---------------------------------------------------------------------------
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null,
  user_id        uuid not null references auth.users (id) on delete cascade,
  front          text not null,
  back           text not null,
  reading        text,
  example        text,
  notes          text,
  status         text not null default 'new'
                   check (status in ('new', 'learning', 'review')),
  ease_factor    real not null default 2.5,
  interval_days  integer not null default 0,
  repetitions    integer not null default 0,
  next_review_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (deck_id, user_id)
    references public.decks (id, user_id) on delete cascade
);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- "What's due for me?" lookups.
create index cards_user_due_idx on public.cards (user_id, next_review_at);
-- Listing a deck's cards, and cascading deck deletes.
create index cards_deck_idx on public.cards (deck_id);

-- Fuzzy search.
create index cards_front_trgm_idx   on public.cards using gin (front   extensions.gin_trgm_ops);
create index cards_back_trgm_idx    on public.cards using gin (back    extensions.gin_trgm_ops);
create index cards_reading_trgm_idx on public.cards using gin (reading extensions.gin_trgm_ops);
create index cards_example_trgm_idx on public.cards using gin (example extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name    text not null,
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- card_tags (many-to-many, same owner on both sides)
-- ---------------------------------------------------------------------------
create table public.card_tags (
  card_id uuid not null,
  tag_id  uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (card_id, tag_id),
  foreign key (card_id, user_id)
    references public.cards (id, user_id) on delete cascade,
  foreign key (tag_id, user_id)
    references public.tags (id, user_id) on delete cascade
);

-- Finding cards by tag, and cascading tag deletes.
create index card_tags_tag_idx on public.card_tags (tag_id);

-- ---------------------------------------------------------------------------
-- review_logs (append-only history)
-- ---------------------------------------------------------------------------
create table public.review_logs (
  id                 uuid primary key default gen_random_uuid(),
  card_id            uuid,
  user_id            uuid not null references auth.users (id) on delete cascade,
  rating             text not null check (rating in ('again', 'good')),
  review_duration_ms integer,
  reviewed_at        timestamptz not null default now(),
  -- Deleting a card keeps its history: only card_id is nulled, user_id stays.
  foreign key (card_id, user_id)
    references public.cards (id, user_id) on delete set null (card_id)
);

-- Streaks / heatmaps by date.
create index review_logs_user_reviewed_idx on public.review_logs (user_id, reviewed_at);
create index review_logs_card_idx on public.review_logs (card_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees and changes only their own rows.
-- (select auth.uid()) is evaluated once per query instead of once per row.
-- ---------------------------------------------------------------------------
alter table public.decks       enable row level security;
alter table public.cards       enable row level security;
alter table public.tags        enable row level security;
alter table public.card_tags   enable row level security;
alter table public.review_logs enable row level security;

-- decks
create policy "decks: select own" on public.decks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "decks: insert own" on public.decks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "decks: update own" on public.decks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "decks: delete own" on public.decks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- cards
create policy "cards: select own" on public.cards for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "cards: insert own" on public.cards for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "cards: update own" on public.cards for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cards: delete own" on public.cards for delete to authenticated
  using ((select auth.uid()) = user_id);

-- tags
create policy "tags: select own" on public.tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "tags: insert own" on public.tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "tags: update own" on public.tags for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tags: delete own" on public.tags for delete to authenticated
  using ((select auth.uid()) = user_id);

-- card_tags: link / unlink only (no update needed)
create policy "card_tags: select own" on public.card_tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "card_tags: insert own" on public.card_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "card_tags: delete own" on public.card_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

-- review_logs: append-only (no update or delete policy)
create policy "review_logs: select own" on public.review_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "review_logs: insert own" on public.review_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table privileges: signed-out visitors get nothing; review_logs can't be
-- edited or deleted even if a policy were added by mistake.
-- ---------------------------------------------------------------------------
revoke all on public.decks, public.cards, public.tags, public.card_tags, public.review_logs
  from anon, authenticated;
grant select, insert, update, delete on public.decks, public.cards, public.tags
  to authenticated;
grant select, insert, delete on public.card_tags to authenticated;
grant select, insert on public.review_logs to authenticated;
