# Forume

Tailored resumes and cover letters from your real experience — ATS-checked,
typeset, honest. Live at **https://forume-jaxx24.vercel.app**.

Next.js 16 · Tailwind v4 · Supabase (auth + data + rate limiting) · any
OpenAI-compatible LLM. Everything runs on free tiers.

## How it works

- **Demo mode (default):** no account. Documents, contact info, and history
  live in the visitor's browser (localStorage) and are sent per-request to
  `/api/generate`. Limited to 5 generations/day per IP.
- **Signed in:** Google or email-code sign-in via Supabase. Data moves to
  Postgres with row-level security; 25 generations/day. On first sign-in the
  app offers to import the browser demo data.
- **Engine:** server env vars only. Production uses Groq
  (`llama-3.3-70b-versatile`) with automatic retry on `LLM_FALLBACK_MODEL`.
  Local dev points at Ollama.
- **Uploads:** PDF (pdfjs), DOCX (mammoth), TXT/MD — parsed in the browser,
  stored as plain text. Scanned PDFs get a clear "paste instead" error.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` is pre-configured for local Ollama (`ollama serve` +
`ollama pull qwen3.5`). Without any LLM env vars the app runs in labeled
sample mode.

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for accounts + rate limits | safe to expose; RLS protects data |
| `LLM_BASE_URL` / `LLM_MODEL` | for real generation | OpenAI-compatible endpoint |
| `LLM_API_KEY` | hosted providers | server-side only |
| `LLM_FALLBACK_MODEL` (+ optional `_BASE_URL`, `_API_KEY`) | no | retried when the primary fails |
| `SUPABASE_SERVICE_ROLE_KEY` | no | hardens the rate limiter (falls back to anon key) |

**Never** put an LLM key in a `NEXT_PUBLIC_*` var — those are compiled into
the public browser bundle.

## One-time dashboard setup (both free)

1. **Google sign-in:** [Google Cloud Console](https://console.cloud.google.com)
   → APIs & Services → Credentials → Create OAuth client (Web application) →
   authorized redirect URI
   `https://xaaaqtsiguclgrhxmura.supabase.co/auth/v1/callback` → copy client
   ID + secret into [Supabase](https://supabase.com/dashboard) → Authentication
   → Providers → Google → enable.
2. **Reliable OTP emails:** [Resend](https://resend.com) free account → API
   key → Supabase → Authentication → SMTP Settings: host `smtp.resend.com`,
   port 465, user `resend`, password = API key, sender
   `onboarding@resend.dev`. (Without this, Supabase's built-in sender allows
   only ~2 emails/hour — fine for testing, not for users.)

## Deploy

Pushes to `main` auto-deploy via the connected Vercel project (`forume`,
team `jaxx24`). Manual deploy: `npx vercel deploy --prod --yes`.

Production env vars are set on Vercel (Groq key server-side). Note: Vercel's
Hobby plan is for non-commercial use — upgrade to Pro before charging money.

## Related

`../ResumeForge` — the original local desktop version (FastAPI + Ollama, six
templates, ATS auto-fix). The web app is its productized sibling.
