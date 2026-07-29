/* The end-to-end match run, shared by /api/jobs/search (on-demand) and
   /api/jobs/refresh (cron): fetch → deterministic score → rank → optional
   LLM fit-refinement for the top matches only (bounded, to respect the free
   Groq quota) → ScoredJob[] sorted best-first.

   Ranking vs. score: the displayed `score` stays a pure, honest resume-fit
   number (keyword overlap). We SORT by a separate composite rank that also
   rewards recognized big employers and title relevance to the query — so
   NVIDIA/Apple/Google-tier and on-topic roles surface first without lying
   about how well the résumé actually fits. */

import { fetchJobs, type FetchOptions } from "./index";
import type { ScoredJob, SearchScope } from "./types";
import { isTopCompany } from "./companies";
import { bandFromScore, overlapScore, refineFit } from "../match";
import { llmConfigFromEnv } from "../llm";

export type RunOptions = FetchOptions & {
  /** How many top candidates get the LLM fit pass. 0 disables it. */
  refineTop?: number;
};

/** Boost for a job whose title contains the user's query terms (strong relevance). */
function titleBoost(title: string, keywords: string): number {
  const q = keywords.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!q.length) return 0;
  const t = title.toLowerCase();
  const hits = q.filter((w) => t.includes(w)).length;
  return Math.min(20, hits * 10);
}

export async function runSearch(
  backgroundText: string,
  scope: SearchScope,
  opts: RunOptions = {},
): Promise<ScoredJob[]> {
  const refineTop = opts.refineTop ?? 6;
  const jobs = await fetchJobs(scope, opts);

  // 1. deterministic pass — honest resume-fit score + a composite rank
  const ranked = jobs.map((j) => {
    const { score, matched, missing } = overlapScore(backgroundText, j.description || j.title);
    const top = isTopCompany(j.company);
    const scored: ScoredJob = {
      ...j, score, matched, missing, isTopCompany: top,
      fit: { level: bandFromScore(score), reasons: [] },
    };
    const rank = score + (top ? 18 : 0) + titleBoost(j.title, scope.keywords);
    return { scored, rank };
  });
  ranked.sort((a, b) => b.rank - a.rank);
  const result = ranked.map((r) => r.scored);

  // 2. optional LLM refinement — top N of the ranked order only, sequential to
  //    stay inside the per-minute rate limit; falls back to the band on failure.
  const cfg = refineTop > 0 ? llmConfigFromEnv() : null;
  if (cfg) {
    for (const job of result.slice(0, refineTop)) {
      job.fit = await refineFit(cfg, backgroundText, job, job.score);
    }
    // the rest keep an honest, plain reason (no fabricated LLM text)
    for (const job of result.slice(refineTop)) {
      job.fit = { level: bandFromScore(job.score), reasons: overlapReason(job) };
    }
  } else {
    for (const job of result) {
      job.fit = { level: bandFromScore(job.score), reasons: overlapReason(job) };
    }
  }

  return result;
}

function overlapReason(job: ScoredJob): string[] {
  const total = job.matched.length + job.missing.length;
  return [`${job.matched.length}/${total} of this role's key terms are in your background.`];
}
