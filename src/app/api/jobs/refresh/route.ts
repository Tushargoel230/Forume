import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runSearch } from "@/lib/jobs/run-search";
import type { ScoredJob, SearchScope } from "@/lib/jobs/types";

export const maxDuration = 300;

/** Scheduled background refresh. Re-runs each signed-in user's saved scope
    through the provider pipeline (including scarce sources like Remotive, which
    the on-demand path skips), stores only new/changed postings, and marks them
    new since the user's last visit. Guarded by the same shared-secret pattern
    as the ops agents (x-agent-secret / AGENT_CRON_SECRET). Triggered by GitHub
    Actions, not Vercel Cron — matching this repo's existing scheduler. */

// Cost guards: bound how much work (and Groq spend) a single run can do.
const MAX_USERS_PER_RUN = Number(process.env.JOBS_REFRESH_MAX_USERS) || 25;
const REFINE_TOP = Number(process.env.JOBS_REFRESH_REFINE_TOP) || 3;

export async function POST(request: Request) {
  const expected = process.env.AGENT_CRON_SECRET;
  const secret = request.headers.get("x-agent-secret") ?? "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  // due = never run, or last run older than the user's cadence
  const { data: prefs, error } = await admin
    .from("job_search_preferences")
    .select("user_id, countries, keywords, remote_pref, date_posted, cadence_hours, last_run_at")
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(MAX_USERS_PER_RUN);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let newMatches = 0;

  for (const p of prefs ?? []) {
    const cadenceMs = (p.cadence_hours ?? 6) * 3600_000;
    if (p.last_run_at && Date.now() - Date.parse(p.last_run_at) < cadenceMs) continue;

    const { data: docs } = await admin.from("documents").select("content").eq("user_id", p.user_id);
    const background = (docs ?? []).map((d) => d.content ?? "").filter(Boolean).join("\n\n");
    if (!background.trim()) continue;

    const scope: SearchScope = {
      keywords: p.keywords ?? "",
      country: (p.countries ?? [])[0] ?? "any",
      remote: (p.remote_pref ?? "any") as SearchScope["remote"],
      datePosted: (p.date_posted ?? "7d") as SearchScope["datePosted"],
    };

    try {
      const jobs = await runSearch(background, scope, { mode: "background", refineTop: REFINE_TOP });
      newMatches += await persist(admin, p.user_id, jobs);
      processed++;
    } catch {
      /* skip this user on failure; the next run retries */
    }
    await admin.from("job_search_preferences")
      .update({ last_run_at: new Date().toISOString() })
      .eq("user_id", p.user_id);
  }

  return NextResponse.json({ ok: true, processed, newMatches });
}

async function persist(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  userId: string,
  jobs: ScoredJob[],
): Promise<number> {
  if (!jobs.length) return 0;
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

  const { data: existing } = await admin
    .from("job_matches").select("job_id").eq("user_id", userId).in("job_id", jobIds);
  const seen = new Set((existing ?? []).map((m) => m.job_id));

  const rows = jobs
    .map((j) => {
      const jobId = idByKey.get(`${j.source}|${j.sourceJobId}`);
      if (!jobId) return null;
      return {
        user_id: userId, job_id: jobId, score: j.score,
        fit_level: j.fit?.level ?? null, fit_reasons: j.fit?.reasons ?? [],
        is_new: !seen.has(jobId), matched_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
  if (rows.length) await admin.from("job_matches").upsert(rows, { onConflict: "user_id,job_id" });
  return rows.filter((r) => r.is_new).length;
}
