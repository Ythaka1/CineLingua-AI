-- CineLingua AI — initial schema.
-- Everything user-owned is protected by row-level security.
-- Timestamps are timestamptz; all media timings are integer milliseconds.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.target_dialect as enum ('DE', 'AT', 'CH');
create type public.media_source_type as enum ('local');
create type public.subtitle_lang as enum ('de', 'en');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, auto-created on signup
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  cefr_level         public.cefr_level not null default 'B2',
  target_dialect     public.target_dialect not null default 'DE',
  daily_goal_minutes integer not null default 20 check (daily_goal_minutes > 0),
  streak             integer not null default 0 check (streak >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile when a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- media — a video the user imported (v1: local files only)
-- ---------------------------------------------------------------------------

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  poster_url  text,
  source_type public.media_source_type not null default 'local',
  created_at  timestamptz not null default now()
);

create index media_user_id_idx on public.media (user_id, created_at desc);

alter table public.media enable row level security;

create policy "media: all own" on public.media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- subtitle_cues — parsed .srt/.vtt cues, owned via parent media
-- ---------------------------------------------------------------------------

create table public.subtitle_cues (
  id        bigint generated always as identity primary key,
  media_id  uuid not null references public.media (id) on delete cascade,
  lang      public.subtitle_lang not null,
  cue_index integer not null check (cue_index >= 0),
  start_ms  integer not null check (start_ms >= 0),
  end_ms    integer not null,
  text      text not null,
  constraint subtitle_cues_time_order check (end_ms > start_ms),
  constraint subtitle_cues_unique_index unique (media_id, lang, cue_index)
);

create index subtitle_cues_lookup_idx on public.subtitle_cues (media_id, lang, start_ms);

alter table public.subtitle_cues enable row level security;

create policy "subtitle_cues: all own via media" on public.subtitle_cues
  for all using (
    exists (
      select 1 from public.media m
      where m.id = media_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.media m
      where m.id = media_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- saved_words — vocabulary items with SRS state
-- ---------------------------------------------------------------------------

create table public.saved_words (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  lemma         text not null,
  surface       text not null,
  translation   text not null,
  cefr          public.cefr_level,
  pos           text,
  gender        text check (gender is null or gender in ('der', 'die', 'das')),
  plural        text,
  ipa           text,
  example       text,
  tags          text[] not null default '{}',
  media_id      uuid references public.media (id) on delete set null,
  cue_id        bigint references public.subtitle_cues (id) on delete set null,
  -- SRS (SM-2 style)
  next_review   timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease          real not null default 2.5 check (ease >= 1.3),
  created_at    timestamptz not null default now(),
  constraint saved_words_unique_lemma unique (user_id, lemma)
);

create index saved_words_review_idx on public.saved_words (user_id, next_review);

alter table public.saved_words enable row level security;

create policy "saved_words: all own" on public.saved_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- saved_sentences — saved sentences with their AI explanation + SRS state
-- ---------------------------------------------------------------------------

create table public.saved_sentences (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  text           text not null,
  translation    text not null,
  explanation_md text,
  tags           text[] not null default '{}',
  media_id       uuid references public.media (id) on delete set null,
  cue_id         bigint references public.subtitle_cues (id) on delete set null,
  -- SRS (SM-2 style)
  next_review    timestamptz not null default now(),
  interval_days  integer not null default 0 check (interval_days >= 0),
  ease           real not null default 2.5 check (ease >= 1.3),
  created_at     timestamptz not null default now()
);

create index saved_sentences_review_idx on public.saved_sentences (user_id, next_review);

alter table public.saved_sentences enable row level security;

create policy "saved_sentences: all own" on public.saved_sentences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- watch_progress — resume position per user × media
-- ---------------------------------------------------------------------------

create table public.watch_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete cascade,
  position_ms integer not null default 0 check (position_ms >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, media_id)
);

alter table public.watch_progress enable row level security;

create policy "watch_progress: all own" on public.watch_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_cache — shared cache of AI explanations.
-- key = sha256 of `kind|input|mode|cefr|dialect` (see src/lib/ai/cache-key.ts).
-- Contains no user data, so it is shared across users: readable and
-- insertable by any authenticated user, never updatable or deletable from
-- the client (server actions insert on miss).
-- ---------------------------------------------------------------------------

create table public.ai_cache (
  key        text primary key,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_cache enable row level security;

create policy "ai_cache: read (authenticated)" on public.ai_cache
  for select to authenticated using (true);
create policy "ai_cache: insert (authenticated)" on public.ai_cache
  for insert to authenticated with check (true);
