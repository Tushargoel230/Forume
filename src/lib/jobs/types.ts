/* Shared shapes for the Job Match feature. Every provider normalizes to
   RawJobPosting so the matching engine and UI never know which source a job
   came from — new sources drop in without touching anything downstream. */

import type { Fit } from "../types";

export type RemotePref = "any" | "remote" | "hybrid" | "onsite";
export type DatePosted = "24h" | "7d" | "30d";

/** The search scope, as chosen in the /jobs filter bar. */
export type SearchScope = {
  /** Free-text role/domain query, e.g. "Robotics Engineer". */
  keywords: string;
  /** Country code from COUNTRIES (e.g. "de"), or "remote"/"any". */
  country: string;
  remote: RemotePref;
  datePosted: DatePosted;
  /** Restrict results to recognized top-tier employers (TOP_COMPANIES). */
  topCompaniesOnly?: boolean;
};

export const DEFAULT_SCOPE: SearchScope = {
  keywords: "",
  country: "any",
  remote: "any",
  datePosted: "7d",
  topCompaniesOnly: false,
};

/** One posting, normalized across every provider. */
export type RawJobPosting = {
  source: string; // "arbeitnow" | "remotive" | "adzuna" | "apify"
  sourceJobId: string;
  title: string;
  company: string;
  location: string;
  country: string; // best-effort code or English name
  description: string;
  url: string;
  postedAt: string | null; // ISO 8601
  salary: string | null;
  remote: boolean | null;
};

/** A posting after matching against the user's background. */
export type ScoredJob = RawJobPosting & {
  score: number; // 0–100 deterministic keyword overlap (honest resume fit)
  fit: Fit | null; // five-band verdict (LLM-refined for the top matches)
  matched: string[];
  missing: string[];
  isNew?: boolean;
  isTopCompany?: boolean; // recognized top-tier employer (surfaced higher + badged)
};

/** Every provider implements this. `live` calls hit the network on demand;
    sources with a tiny free quota mark themselves `scarce` so the on-demand
    path skips them and leaves them to the scheduled background refresh. */
export type JobProvider = {
  name: string;
  /** True only when the provider has whatever credential it needs. */
  isConfigured(): boolean;
  /** Scarce = tiny daily quota (e.g. Remotive asks for ≤4 calls/day globally). */
  scarce?: boolean;
  /** Paid = costs money per result (Apify). Only used when includePaid is set,
      so anonymous traffic and the background cron can't drain a small budget. */
  paid?: boolean;
  fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]>;
};
