-- Output language — lets a generated resume/cover be written in a chosen language.
-- Run once in the Supabase SQL editor. RLS already protects `applications`
-- (auth.uid() = user_id), so this new column inherits that protection.
-- Only the GENERATED output is localized; the candidate's uploaded background
-- documents are never translated or altered.

alter table public.applications
  add column if not exists language text default 'en';
