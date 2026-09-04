-- Application Tracker — adds outcome/funnel fields to the existing applications table.
-- Run once in the Supabase SQL editor. RLS already protects `applications`
-- (auth.uid() = user_id), so these new columns inherit that protection.

alter table public.applications
  add column if not exists status           text default 'drafted',
  add column if not exists job_url          text,
  add column if not exists notes            text,
  add column if not exists applied_at       timestamptz,
  add column if not exists last_activity_at timestamptz default now(),
  add column if not exists follow_up_at     timestamptz,
  -- cached, on-demand outputs so we never re-spend an LLM call for the same app
  add column if not exists interview_prep   jsonb,
  add column if not exists upskill_plan     jsonb;

create index if not exists applications_user_status_idx
  on public.applications (user_id, status);

-- Status vocabulary (enforced in the app, kept as plain text for flexibility):
--   saved · drafted · applied · interviewing · offer · hired · rejected · no_response
