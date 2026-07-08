# Forume — Project Documentation

**Live:** https://forume-jaxx24.vercel.app · **Repo:** github.com/Tushargoel230/Forume

---

## 1. What is Forume?

Forume is a web application that turns one master version of your work history into a **tailored, ATS-safe resume and cover letter for every job you apply to** — written by an AI engine that is only allowed to use facts from your own documents.

You upload your real resume(s) once. For each application, you paste the job description, and Forume:

1. **Analyzes** the job like a recruiter and an ATS would — extracting the exact keywords, the strongest matches in your background, and the honest gaps.
2. **Writes** a tailored resume (structured JSON, rendered into six typeset templates) and a cover letter, mirroring the job's exact terminology *only where it is true of you*.
3. **Scores** the result against the checks resume parsers actually run (keyword coverage, structure, parser safety) and shows an animated ATS readiness gauge.
4. **Judges your fit** on a five-band scale (Strong fit → Not a fit yet) with 2–4 blunt reasons — an honest interview outlook, judged from your background, not from the polished resume.
5. **Fixes** flagged problems on demand: one targeted engine pass weaves missing keywords into the resume, with a hard rule against inventing anything.

Everything is editable (structured editor for every section + the cover letter), switchable between templates instantly, exportable to PDF via print CSS, and archived with the full job description, company, and role.

## 2. Why — the problem and the use case

**The problem.** Job seekers rewrite the same resume dozens of times because every posting wants a different emphasis, and before a human reads a word, an Applicant Tracking System (ATS) has already parsed and filtered it. Most rejections happen at the machine layer. Existing AI tools either hallucinate experience (dangerous) or produce generic output (useless).

**The audience.** Young professionals, students, and career changers — people applying to many roles at once who are frustrated by the silence and can't afford a €200/hr consultant.

**The positioning.** Forume behaves like a high-end application consultancy, not a text generator:
- **Honest by design** — the engine's hard constraint is that every fact must come from the user's documents. It will decline to add a keyword the background doesn't support.
- **Print-shop craft** — the brand identity (crop marks, proof stamps, letterpress serif, "the composing room") frames each application as a typeset proof, not AI slop.
- **Free while we grow** — every feature is free during early access to build a user base; the pricing page already shows the future tiers (Starter free / Pro €14 / Concierge €199) so the business model is visible from day one.

**The origin.** Forume started as a local desktop app (`ResumeForge`: FastAPI + SQLite + Ollama, in this repo's sibling folder) built to stop paying per-application LLM costs. The web version is the productized rewrite of that engine.

## 3. Architecture at a glance

```
Browser (Next.js React client)
│
│  documents parsed CLIENT-SIDE (pdfjs / mammoth) → plain text
│  demo users: everything stored in localStorage
│  signed-in:  Supabase JS client (RLS-protected tables)
│
├─► POST /api/generate ──┐        Vercel serverless functions
├─► POST /api/fix ───────┤        (Next.js route handlers)
│                        │
│                        ├─► Supabase Postgres  (profiles, documents,
│                        │        applications, generation_usage/RPC)
│                        │
│                        └─► LLM engine (OpenAI-compatible /chat/completions)
│                                 prod:  Groq  llama-3.3-70b-versatile
│                                 fallback: llama-3.1-8b-instant
│                                 local dev: Ollama llama3.2
│
└─► Supabase Auth (Google OAuth + email OTP) → /auth/callback
```

Three moving parts, all on free tiers, no servers to run:

| Layer | Technology | Hosting |
|---|---|---|
| Frontend + API | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 | Vercel (Hobby) |
| Database + Auth | Supabase (Postgres, Row Level Security, GoTrue auth) | Supabase free tier (eu-west-1) |
| AI engine | Groq free tier via OpenAI-compatible API | Groq cloud |

## 4. Frontend

**Stack:** Next.js App Router with mostly client components for the app itself; the landing page is server-rendered and static. Tailwind v4 (`@theme inline` design tokens in `globals.css`). Fonts: **Newsreader** (display serif) + **Public Sans** (body).

**Design system** — a "pre-press print shop" identity used consistently on every page:
- Warm light base (linen `#f6f4ef`, paper `#fffefb`, ink `#1f2124`) with **crimson `#c5283d`** as the registration-mark brand color, plus dark "coal" cinematic bands (hero, final CTA, sign-in brand panel) with warm gold accents.
- Signature elements: CSS **crop marks** on proof cards, a rotated **rubber-stamp** component, uppercase tracked "spec label" kickers, serif editorial headlines.
- Motion: scroll reveals (IntersectionObserver), hero load-in rises, an animated SVG score arc — all respecting `prefers-reduced-motion`.

**Key pages/components** (`src/`):

| File | Role |
|---|---|
| `app/page.tsx` | Landing: cinematic hero, scroll story, steps, ATS proof arc, template gallery, pricing tiers, legal footer |
| `app/app/page.tsx` | The product: sidebar "composing room" shell with three sections — New application, Your sources, Archive — plus the result panel (Resume / Cover letter / ATS check / Fit / Edit tabs, template switcher, Save-as-PDF) |
| `app/signin/page.tsx` | Split sign-in: dark brand panel + Google OAuth and email OTP |
| `components/ResumeSheet.tsx` | Renders the resume JSON into 6 print-safe templates (Onyx, Air, Century, Scarlet, Regent, Folio) — pure CSS themes over one single-column structure |
| `components/ResumeEditor.tsx` | Structured editor for every resume section + cover letter |
| `lib/extract-text.ts` | **Client-side** PDF/DOCX/TXT text extraction (pdfjs-dist + mammoth) — files never leave the browser as binaries |
| `components/AuthCatch.tsx` | Catches stray OAuth tokens landing on the homepage and forwards them to `/auth/callback` |

**PDF export** is the browser's own print engine: `@media print` CSS isolates the `.print-sheet` element, so "Save as PDF" produces a pixel-faithful, real-text (parser-readable) document with zero server cost.

**Ship package:** OG image (edge-rendered with satori), SVG favicon, robots.txt + sitemap, `/privacy` `/terms` `/imprint` legal pages (Germany-based), branded 404, Vercel Analytics.

## 5. Backend

There is no standalone backend server — the API is two Next.js route handlers deployed as Vercel serverless functions.

### `/api/generate` — the writing pipeline (3 LLM calls)

1. **Analysis** — system prompt: expert recruiter. Input: user's documents (the "background") + JD. Output JSON: `top_keywords` (10–18 exact ATS terms), `strongest_matches`, `gaps` with honest reframes, `positioning`, `tone`, and the **`fit` verdict** (`strong|good|fair|stretch|weak`) with `fit_reasons`.
2. **Resume writing** — system prompt: elite resume writer with a hard honesty constraint ("never invent employers, titles, dates, technologies, or numbers"). Gets background + JD + the analysis as strategy. Returns structured resume JSON (headline, summary, skills groups, experience, projects, education, certifications).
3. **Cover letter** — separate voice-focused prompt, 250–350 words, no template phrases.

Then the server computes the **ATS report** deterministically (`lib/ats.ts` — pure TypeScript, no AI): keyword coverage against the analysis terms, plus structural checks. The fit verdict rides on the report (`ats.fit`).

### `/api/fix` — the ATS auto-fix pass (1 LLM call)

Takes the current resume + the ATS report's flagged problems (missing keywords, failed checks) and runs one low-temperature editing pass: work each missing term into the most relevant bullet/skills/summary **only if the background supports it**. A guard restores any section the model accidentally drops; the ATS score is recomputed. The fit verdict is deliberately carried over unchanged — fit judges the person, not the draft.

### Engine abstraction (`lib/llm.ts`)

Any OpenAI-compatible `/chat/completions` endpoint works — configured entirely by server env vars (never exposed to the client):

| Env var | Production | Local dev |
|---|---|---|
| `LLM_BASE_URL` | Groq | `http://localhost:11434/v1` (Ollama) |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | `llama3.2:latest` |
| `LLM_FALLBACK_MODEL` | `llama-3.1-8b-instant` | — |
| `LLM_API_KEY` | Groq key (encrypted on Vercel) | not needed |

Resilience against free-tier limits: context capped at 11k chars so three sequential calls fit Groq's 12k tokens/minute; 429 responses are retried twice honoring `Retry-After`; if the primary model still fails, the whole pipeline re-runs on the fallback model; errors surface as friendly messages ("The writing engine is at capacity — try again in a minute").

### Demo mode vs accounts — the same API, two data paths

- **Demo (no sign-up):** documents, contact, and the archive live in the browser's `localStorage`. Each request carries the documents in the POST body with an `X-Demo-Email` header. Nothing is stored server-side.
- **Signed-in:** the request carries the Supabase access token; the server reads documents/profile from Postgres and inserts the finished application. On first sign-in, browser demo data is offered for one-click import into the account.

### Rate limiting (`lib/rate-limit.ts`)

A single Postgres function `increment_usage(identifier, limit)` (SECURITY DEFINER, atomic upsert) counts daily engine passes: **3/day for demo users** (keyed by SHA-256 of the IP — no raw IPs stored) and **25/day signed-in** (keyed by user id). Fix passes count too. The limiter *fails open*: if it's ever unreachable, generation proceeds rather than blocking users.

## 6. Database & auth (Supabase)

**Tables** (all with Row Level Security — `auth.uid() = user_id` for every operation, so users can only ever touch their own rows):

| Table | Contents |
|---|---|
| `profiles` | contact block (name, phone, location, linkedin, website), PK = user id |
| `documents` | uploaded source documents as extracted plain text |
| `applications` | full archive: company, role, **jd**, resume (jsonb), cover_letter, ats report (jsonb, incl. fit), template, timestamps |
| `generation_usage` | (identifier, day, count) — the rate-limit ledger; no client policies, touched only via the RPC |

**Auth:** Supabase GoTrue with two methods — **Google OAuth** and **email one-time code** (works as a 6-digit code *or* a clickable magic link; both land on `/auth/callback`, which exchanges the code/tokens and redirects into the app). Email delivery via Resend SMTP for volume. The client is placeholder-safe: builds and demo mode work even with no Supabase env vars set.

## 7. Deployment & the glue

- **Git-connected CI/CD:** the GitHub repo is connected to the Vercel project — every push to `main` builds (Turbopack) and deploys to production automatically. A broken duplicate project was deleted so exactly one project owns the domain.
- **Secrets:** all keys (Groq, Supabase service role) are encrypted Vercel env vars, server-side only. Rule learned the hard way: LLM keys must never be `NEXT_PUBLIC_*`, or they compile into the public JS bundle.
- **Local development** mirrors production exactly, except `.env.local` points the engine at local Ollama — same code path, zero API cost while developing. Note that local dev shares the production database and rate-limit ledger.
- **Cost:** €0/month. Vercel Hobby + Supabase free + Groq free tier (~14.4k requests/day). The rate limiter exists precisely to keep a traffic spike inside the Groq quota.

**How a generation actually flows end to end:**

1. User uploads `resume.pdf` → pdfjs extracts text **in the browser** → stored (localStorage or `documents` table).
2. User pastes a JD and clicks Generate → client POSTs to `/api/generate` with the session token (or demo docs inline).
3. The function authenticates, checks the daily quota via the Postgres RPC, assembles the background context, and runs the 3-call pipeline on Groq.
4. It computes the ATS report + attaches the fit verdict, inserts the application row (signed-in), and returns JSON.
5. The client renders the resume JSON through the chosen template, animates the ATS gauge, shows the fit read, and archives the whole thing. Switching templates, editing, fixing, and printing all happen from that stored JSON — the resume is **data**, presentation is disposable.

## 8. Business model & roadmap

**Now (growth phase):** everything free — 3 generations/day anonymous, 25/day with a free account. The goal is habit: a user who has their sources loaded and an archive building up has a reason to return every application season.

**Later:** the pricing page already frames the tiers — **Starter** (free, 3/day, all templates, ATS report, PDF), **Pro €14/mo** (25/day, priority engine, sync, early features), **Concierge €199 one-time** (human review, interview prep, LinkedIn rewrite). Payments (Lemon Squeezy), a custom domain, and a Vercel Pro upgrade (required before charging — Hobby ToS is non-commercial) are deliberately deferred until usage justifies them.

**Technical roadmap:** cross-provider engine fallback (a free Gemini key drops into `LLM_FALLBACK_BASE_URL` with zero code changes), template thumbnails in the picker, richer archive filtering, and the desktop app's RAG retrieval for very large source libraries.
