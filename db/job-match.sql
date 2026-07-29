-- Job Match feature — schema.
-- Run this in the Supabase SQL editor (or `supabase db execute`) once.
-- Mirrors the existing tables' RLS model: every row is owned by a user and
-- `auth.uid() = user_id` gates every operation. Demo (no-account) users never
-- touch these tables — their searches run live and are never persisted.

-- 1. Each signed-in user's saved search scope (drives the background cron).
create table if not exists public.job_search_preferences (
  user_id      uuid primary key references auth.users on delete cascade,
  countries    text[] default '{}',
  keywords     text default '',
  remote_pref  text default 'any',
  date_posted  text default '7d',
  cadence_hours int default 6,
  last_run_at  timestamptz,
  updated_at   timestamptz default now()
);

-- 2. De-duplicated postings, shared across users (not user-scoped).
create table if not exists public.job_postings (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  source_job_id text not null,
  title         text,
  company       text,
  location      text,
  country       text,
  description   text,
  url           text,
  posted_at     timestamptz,
  salary        text,
  remote        boolean,
  fetched_at    timestamptz default now(),
  unique (source, source_job_id)
);

-- 3. A user's match against a posting (the per-user scored result).
create table if not exists public.job_matches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  job_id      uuid not null references public.job_postings on delete cascade,
  score       int,
  fit_level   text,
  fit_reasons text[] default '{}',
  is_new      boolean default true,
  matched_at  timestamptz default now(),
  unique (user_id, job_id)
);

create index if not exists job_matches_user_score_idx
  on public.job_matches (user_id, score desc);

-- ---- Row Level Security ---------------------------------------------------

alter table public.job_search_preferences enable row level security;
alter table public.job_postings           enable row level security;
alter table public.job_matches            enable row level security;

-- Preferences: owner-only, all operations.
drop policy if exists "own prefs" on public.job_search_preferences;
create policy "own prefs" on public.job_search_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Postings: any signed-in user may read the shared pool; only the service role
-- (background cron / server routes) writes. No client insert/update policy =
-- writes are limited to the service-role key, which bypasses RLS.
drop policy if exists "read postings" on public.job_postings;
create policy "read postings" on public.job_postings
  for select using (auth.role() = 'authenticated');

-- Matches: owner-only.
drop policy if exists "own matches" on public.job_matches;
create policy "own matches" on public.job_matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
