import { NextResponse } from "next/server";
import { supabaseAsUser, supabaseAdmin } from "@/lib/supabase";
import { withinDailyLimit, demoRateKey, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { runSearch } from "@/lib/jobs/run-search";
import { activeSources } from "@/lib/jobs/index";
import { DEFAULT_SCOPE, type ScoredJob, type SearchScope } from "@/lib/jobs/types";
import type { FitLevel } from "@/lib/types";

export const maxDuration = 300;

type Doc = { name?: string; content?: string };

/** Premium = email is on the PREMIUM_EMAILS allowlist (comma-separated, server
    env). Empty/unset → nobody is premium, so paid sources (Apify) stay off. */
function isPremium(email: string | null): boolean {
  if (!email) return false;
  const allow = (process.env.PREMIUM_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.trim().toLowerCase());
}

function readScope(raw: unknown): SearchScope {
  const s = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v : d);
  return {
    keywords: str(s.keywords, "").slice(0, 200),
    country: str(s.country, DEFAULT_SCOPE.country),
    remote: (["any", "remote", "hybrid", "onsite"].includes(s.remote as string)
      ? s.remote : DEFAULT_SCOPE.remote) as SearchScope["remote"],
    datePosted: (["24h", "7d", "30d"].includes(s.datePosted as string)
      ? s.datePosted : DEFAULT_SCOPE.datePosted) as SearchScope["datePosted"],
    topCompaniesOnly: Boolean(s.topCompaniesOnly),
  };
}

/** Returning-user load: saved scope + cached matches (signed-in only; demo keeps
    no server state). Lets /jobs render instantly with "new since last visit"
    marks before any fresh network call. */
export async function GET(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token.startsWith("demo-")) {
    return NextResponse.json({ scope: null, jobs: [], lastRunAt: null });
  }
  const asUser = supabaseAsUser(token);
  const { data: u, error } = await asUser.auth.getUser(token);
  if (error || !u.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [{ data: pref }, { data: matches }] = await Promise.all([
    asUser.from("job_search_preferences").select("*").eq("user_id", u.user.id).maybeSingle(),
    asUser
      .from("job_matches")
      .select("score, fit_level, fit_reasons, is_new, matched_at, job_postings(*)")
      .eq("user_id", u.user.id)
      .order("score", { ascending: false })
      .limit(60),
  ]).catch(() => [{ data: null }, { data: null }] as const);

  const jobs: ScoredJob[] = (matches ?? []).map((m) => {
    const p = (m as Record<string, unknown>).job_postings as Record<string, unknown>;
    return {
      source: String(p?.source ?? ""), sourceJobId: String(p?.source_job_id ?? ""),
      title: String(p?.title ?? ""), company: String(p?.company ?? ""),
      location: String(p?.location ?? ""), country: String(p?.country ?? ""),
      description: String(p?.description ?? ""), url: String(p?.url ?? ""),
      postedAt: (p?.posted_at as string) ?? null, salary: (p?.salary as string) ?? null,
      remote: (p?.remote as boolean) ?? null,
      score: Number(m.score ?? 0),
      fit: { level: ((m.fit_level as FitLevel) ?? "weak"), reasons: (m.fit_reasons as string[]) ?? [] },
      matched: [], missing: [], isNew: Boolean(m.is_new),
    };
  });

  const scope = pref
    ? { keywords: pref.keywords ?? "", country: (pref.countries ?? [])[0] ?? "any", remote: pref.remote_pref ?? "any", datePosted: pref.date_posted ?? "7d" }
    : null;
  return NextResponse.json({ scope, jobs, lastRunAt: pref?.last_run_at ?? null });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const isDemo = token.startsWith("demo-");
  const body = await request.json().catch(() => ({}));
  const scope = readScope(body.scope);

  // --- resolve the user + their background text ---------------------------
  let userId: string | null = null;
  let userEmail: string | null = null;
  let backgroundText = "";

  if (isDemo) {
    const key = `jobs:${demoRateKey(request)}`;
    if (!(await withinDailyLimit(key, DEMO_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've hit today's free search limit. Sign in for more." },
        { status: 429 },
      );
    }
    const docs: Doc[] = Array.isArray(body.documents) ? body.documents : [];
    backgroundText = docs.map((d) => d.content ?? "").filter(Boolean).join("\n\n");
  } else {
    if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const asUser = supabaseAsUser(token);
    const { data: u, error } = await asUser.auth.getUser(token);
    if (error || !u.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    userId = u.user.id;
    userEmail = u.user.email ?? null;
    if (!(await withinDailyLimit(`jobs:user:${userId}`, USER_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's search limit — try again tomorrow." }, { status: 429 });
    }
    const { data: docs } = await asUser.from("documents").select("content");
    backgroundText = (docs ?? []).map((d) => (d as Doc).content ?? "").filter(Boolean).join("\n\n");
  }

  // Paid sources (Apify) are reserved for PREMIUM members — an allowlist in
  // PREMIUM_EMAILS. Empty allowlist = nobody premium = Apify never spends,
  // so the free sources power everyone until paid tiers exist.
  const includePaid = isPremium(userEmail);

  if (!backgroundText.trim()) {
    // no resume on file yet → tell the UI to show the first-run empty state
    return NextResponse.json({ jobs: [], needsResume: true, sources: activeSources("live", includePaid) });
  }

  // --- run the match -------------------------------------------------------
  let jobs: ScoredJob[];
  try {
    // refineTop 0: no LLM pass on the live path — the deterministic band/score
    // is instant and honest. (The sequential Groq refine could blow the ~60s
    // function limit and surface as a client "Failed to fetch".) The background
    // cron still refines, where no user is waiting.
    jobs = await runSearch(backgroundText, scope, { mode: "live", refineTop: 0, includePaid });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed." },
      { status: 502 },
    );
  }

  // --- persist for signed-in users (best-effort; never blocks the response) --
  if (userId && jobs.length) {
    try {
      await persist(userId, scope, jobs);
    } catch {
      /* tables may not exist yet (SQL not run) — degrade to live-only silently */
    }
  }

  return NextResponse.json({
    jobs,
    needsResume: false,
    sources: activeSources("live", includePaid),
    checkedAt: new Date().toISOString(),
  });
}

/** Upsert postings + this user's matches, marking which are new since last visit. */
async function persist(userId: string, scope: SearchScope, jobs: ScoredJob[]) {
  const admin = supabaseAdmin();
  if (!admin) return;

  const postingRows = jobs.map((j) => ({
    source: j.source, source_job_id: j.sourceJobId, title: j.title, company: j.company,
    location: j.location, country: j.country, description: j.description.slice(0, 8000),
    url: j.url, posted_at: j.postedAt, salary: j.salary, remote: j.remote,
  }));
  const { data: upserted } = await admin
    .from("job_postings")
    .upsert(postingRows, { onConflict: "source,source_job_id" })
    .select("id, source, source_job_id");

  const idByKey = new Map((upserted ?? []).map((p) => [`${p.source}|${p.source_job_id}`, p.id]));
  const jobIds = [...idByKey.values()];

  // which of these the user has already seen (so is_new is honest)
  const { data: existing } = await admin
    .from("job_matches").select("job_id").eq("user_id", userId).in("job_id", jobIds);
  const seen = new Set((existing ?? []).map((m) => m.job_id));

  const matchRows = jobs
    .map((j) => {
      const jobId = idByKey.get(`${j.source}|${j.sourceJobId}`);
      if (!jobId) return null;
      return {
        user_id: userId, job_id: jobId, score: j.score,
        fit_level: j.fit?.level ?? null, fit_reasons: j.fit?.reasons ?? [],
        is_new: !seen.has(jobId), matched_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (matchRows.length) await admin.from("job_matches").upsert(matchRows, { onConflict: "user_id,job_id" });

  await admin.from("job_search_preferences").upsert({
    user_id: userId, countries: [scope.country], keywords: scope.keywords,
    remote_pref: scope.remote, date_posted: scope.datePosted,
    last_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
}
