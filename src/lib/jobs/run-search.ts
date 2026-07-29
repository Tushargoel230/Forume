/* The end-to-end match run, shared by /api/jobs/search (on-demand) and
   /api/jobs/refresh (cron): fetch → deterministic score → sort → optional
   LLM fit-refinement for the top matches only (bounded, to respect the free
   Groq quota) → ScoredJob[] sorted best-first. */

import { fetchJobs, type FetchOptions } from "./index";
import type { ScoredJob, SearchScope } from "./types";
import { bandFromScore, overlapScore, refineFit } from "../match";
import { llmConfigFromEnv } from "../llm";

export type RunOptions = FetchOptions & {
  /** How many top candidates get the LLM fit pass. 0 disables it. */
  refineTop?: number;
};

export async function runSearch(
  backgroundText: string,
  scope: SearchScope,
  opts: RunOptions = {},
): Promise<ScoredJob[]> {
  const refineTop = opts.refineTop ?? 6;
  const jobs = await fetchJobs(scope, opts);

  // 1. deterministic pass — every job gets a score + band, no AI
  const scored: ScoredJob[] = jobs.map((j) => {
    const { score, matched, missing } = overlapScore(backgroundText, j.description || j.title);
    return { ...j, score, matched, missing, fit: { level: bandFromScore(score), reasons: [] } };
  });
  scored.sort((a, b) => b.score - a.score);

  // 2. optional LLM refinement — top N only, sequential to stay inside the
  //    per-minute rate limit; falls back to the deterministic band on failure.
  const cfg = refineTop > 0 ? llmConfigFromEnv() : null;
  if (cfg) {
    const top = scored.slice(0, refineTop);
    for (const job of top) {
      job.fit = await refineFit(cfg, backgroundText, job, job.score);
    }
  } else {
    // no engine configured: keep the honest deterministic band, add a plain reason
    for (const job of scored) {
      job.fit = { level: bandFromScore(job.score), reasons: [`${job.matched.length}/${job.matched.length + job.missing.length} of this role's key terms are in your background.`] };
    }
  }

  return scored;
}
