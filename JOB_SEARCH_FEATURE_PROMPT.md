# Build prompt: "Job Match" — live job search page for Forume

Paste everything below into Claude Code (Opus) at the root of the `forume-web` repo.

---

## Context (read first)

You're working in **Forume**, a Next.js 16 (App Router, Turbopack) + Tailwind v4 + Supabase app that turns a user's real resume into tailored, ATS-safe resumes and cover letters per job posting. Read `PROJECT.md` and `AGENTS.md` at the repo root before touching anything — they describe the full architecture, the "pre-press print shop" design system (linen/paper/ink/crimson palette, Newsreader + Public Sans, crop marks, rubber stamps, `<Reveal>` scroll-ins, `<Logo />`), the existing LLM pipeline (`lib/llm.ts`, Groq-backed), the ATS scorer (`lib/ats.ts`), the resume/contact types (`lib/types.ts`), and the demo-vs-signed-in data model (localStorage vs Supabase RLS tables `profiles`/`documents`/`applications`).

Do **not** restyle or rebuild anything that already exists — reuse `ResumeSheet`, `Reveal`, `Logo`, the `cropmarks`/`stamp` CSS classes, and the Tailwind design tokens defined in `src/app/globals.css`. This feature is additive.

## Feature: "Job Match" — a new page that continuously finds real, currently-live job postings matched to the user's resume

### 1. Entry point on the homepage

Add a nav/CTA entry ("Find matching jobs" / "Job Match") on `src/app/page.tsx` and in the app shell (`src/app/app/page.tsx` sidebar) linking to a new route: `src/app/jobs/page.tsx`.

### 2. First-run vs returning-user flow

- **No resume/documents on file yet** (check the same source `app/app/page.tsx` reads — `documents` table for signed-in users, `localStorage` for demo): show an empty state prompting the user to upload their resume first, reusing the existing upload UI/extraction (`lib/extract-text.ts`). Don't duplicate the parser — link/redirect into the existing "Your sources" upload flow and return to `/jobs` once at least one document exists.
- **Resume already on file:** skip straight to the search experience and auto-run a first search using inferred defaults (most recent resume's headline/skills as the query, user's profile location as the country if set).
- **Returning with new/updated resume:** if the newest document's `updated_at` (or a new `last_matched_at` marker — see schema below) is newer than the last completed job search, automatically kick off a fresh match run and visually mark which results are new since the last visit.

### 3. Search scope controls (top of the page)

A filter bar, styled as a "spec sheet" (uppercase kicker labels, hairline-bordered fields, crimson primary button), with:
- **Country / region dropdown** (multi-select capable later, single-select v1) — this is the main ask, drives which country/locale is passed to the job-source connectors.
- **Domain / role keyword field** — free text, pre-filled from the resume's headline/top skills but editable (e.g. "Robotics Engineer", "Frontend Developer").
- **Remote / hybrid / on-site toggle.**
- **Date-posted filter** (24h / 7d / 30d) — default 7d, since the whole point is *currently online* postings.
- **Refresh now** button to force an immediate re-search outside the scheduled cadence.

### 4. Where the job data comes from — Apify connector (primary) + fallbacks

Use the **Apify MCP connector already available in this environment** to pull real postings server-side (never client-side — API tokens stay server-only, same rule as `LLM_API_KEY`). Recommended actors, in priority order (call `fetch-actor-details` on each before wiring to confirm current input schema, since Apify actors change their schemas over time):

1. **`fantastic-jobs/career-site-job-listing-api`** — primary source. Direct-from-ATS postings (Workday, Greenhouse, Ashby, Lever, iCIMS, etc.) across 175k+ companies, AI-enriched, supports `locationSearch`, `titleSearch`, `descriptionSearch`, `timeRange`, `hasSalary`. Best signal-to-noise, least duplicate/stale data.
2. **`fantastic-jobs/advanced-linkedin-job-search-api`** — secondary source for LinkedIn-specific reach (10M+ jobs/month), supports `locationSearch`, `titleSearch`, `datePostedAfter`, `seniorityFilter`.
3. **`orgupdate/google-jobs-scraper`** or **`kaix/indeed-scraper`** — broad-net fallback per country when the above two return thin results for a niche domain/country combo; `kaix/indeed-scraper` explicitly supports 54 countries and per-country `country`/`location` params, useful for the country dropdown.

Build a thin abstraction (`src/lib/jobs/providers/*.ts`) so providers can be swapped/added without touching the matching or UI code — one `fetchJobs(params): Promise<RawJobPosting[]>` per provider, normalized to a shared `RawJobPosting` shape (title, company, location, country, description, url, source, postedAt, salary?, remote?).

Also check, at build time, whether any **other job-related MCP connectors** are available/authorized in this environment (search the connector registry for "jobs", "recruiting", "ATS", "LinkedIn") and wire in any that are already connected — don't assume Apify is the only option, but don't block the feature on connectors that require OAuth the user hasn't completed; degrade gracefully to whichever sources are actually authorized, and surface in the UI which sources are active.

### 5. Continuous search — not just a one-off fetch

"Continuously searching the internet" means a background refresh cycle, not a spinner that runs once:
- Add a Vercel Cron job (`vercel.json` `crons` entry, e.g. every 6 hours) hitting a new route `src/app/api/jobs/refresh/route.ts` (protected by a shared secret header, same pattern as any existing cron/trigger route in `src/app/api/admin/trigger`) that re-runs active users' saved search preferences through the provider pipeline, de-duplicates against jobs already stored, and stores only new/changed postings.
- Store each signed-in user's last search scope (country, keywords, remote pref, cadence) so the cron knows what to re-run per user — demo users only get on-demand refresh (no background cron without an account, since there's nothing to key the schedule on).
- Rate/cost-guard this like `lib/rate-limit.ts` already guards the LLM: cap Apify runs per user per day, and cap total actor spend — Apify actors above are pay-per-result, so cost must be bounded (e.g. `maxItems`/`limit` per run, and a daily cap similar to the existing 3/day-demo, 25/day-signed-in pattern).

### 6. Matching engine — score each job against the user's resume

For every normalized `RawJobPosting`, compute a **match score (0–100)** and a short reasoning, reusing the existing honesty-first philosophy:
- Deterministic keyword overlap pass first (cheap, reuse the normalization/synonym logic already in `lib/ats.ts` — extract the shared bits into `lib/ats.ts` or a new `lib/match.ts` so it isn't duplicated) comparing the job description's key terms against the resume's skills/experience/projects text.
- Optional LLM refinement pass (reuse `lib/llm.ts`'s engine abstraction) only for the top N keyword-overlap candidates per search, to produce the same five-band verdict already defined in `lib/types.ts` (`FitLevel`: strong/good/fair/stretch/weak) plus 2–4 blunt reasons, exactly like the existing `/api/generate` analysis stage — same honesty constraint, same voice.
- Sort results by score descending; show the band as a small stamp/badge, not a raw number-only UI (match the existing fit-meter treatment described in `DESIGN_BRIEF.md`).

### 7. Data model (Supabase)

Add tables (RLS: `auth.uid() = user_id`, mirroring existing tables):

```sql
job_search_preferences (
  user_id uuid primary key references auth.users,
  countries text[], keywords text, remote_pref text,
  date_posted text, cadence_hours int default 6,
  last_run_at timestamptz
)

job_postings (
  id uuid primary key default gen_random_uuid(),
  source text, source_job_id text, title text, company text,
  location text, country text, description text, url text,
  posted_at timestamptz, salary text, remote boolean,
  fetched_at timestamptz default now(),
  unique (source, source_job_id)
)

job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  job_id uuid references job_postings,
  score int, fit_level text, fit_reasons text[],
  is_new boolean default true,
  matched_at timestamptz default now(),
  unique (user_id, job_id)
)
```

Demo (no-account) users get an on-demand, non-persisted version: run the search live on request, store nothing server-side, cap it under the existing demo rate limit — same "no account, no server state" rule the rest of the app follows.

### 8. UI for the results

- A responsive grid/list of "proof cards" (reuse the `cropmarks` card treatment) — company, title, location/remote badge, country flag or code, posted-date, match-score stamp, 2–3 line honest fit reasoning, "View posting" (external link) and **"Generate tailored resume for this job"** — the latter should pipe straight into the existing `/api/generate` flow with the JD pre-filled, exactly like manually pasting a JD today, so the whole existing pipeline (analysis → resume → cover letter → ATS report) is reused unchanged.
- Empty/loading states styled per `DESIGN_BRIEF.md` (spec-label kickers, restrained motion, `prefers-reduced-motion` respected).
- Clear labeling of data freshness ("checked 2h ago", "new since your last visit") and which source(s) are live.

### 9. What "done" looks like

- New route `/jobs` reachable from the homepage and the app shell.
- Working end-to-end for a signed-in user with a resume on file: pick country + keyword scope → see real, deduplicated, dated job postings with an honest match score → click through to auto-generate a tailored resume for any of them.
- Background refresh cron in place and cost-bounded.
- No LLM or Apify token ever shipped to the client bundle.
- Mobile-responsive (~380px), keyboard-accessible, light + dark handled, matches the existing brand identity — not a bolted-on generic job board look.

Before writing code, give a short implementation plan (file list + order) and flag any open questions (e.g., which Apify actor input schema fields are still valid — verify live, don't assume) before proceeding.
