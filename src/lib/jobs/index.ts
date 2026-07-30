/* Orchestrator: fans a scope out to every configured provider in priority
   order, normalizes, filters against the scope, de-duplicates, and returns a
   single RawJobPosting[]. The matching engine and the API routes talk only to
   this — providers can be added/removed without touching anything else. */

import type { JobProvider, RawJobPosting, SearchScope } from "./types";
import { isTooOld, matchesCountry, matchesRemote } from "./scope";
import { apify } from "./providers/apify";
import { jsearch } from "./providers/jsearch";
import { adzuna } from "./providers/adzuna";
import { themuse } from "./providers/themuse";
import { arbeitnow } from "./providers/arbeitnow";
import { remotive } from "./providers/remotive";

// Priority order (dedup keeps the earliest/highest-priority hit):
//   apify   — premium, direct-from-ATS (gated behind includePaid)
//   jsearch — best free quality (Google for Jobs), needs a free key
//   adzuna  — free keyword+country search
//   themuse — free, real companies (category-based)
//   arbeitnow / remotive — zero-auth supplements
const PROVIDERS: JobProvider[] = [apify, jsearch, adzuna, themuse, arbeitnow, remotive];

// Sources with NO server-side keyword search → apply a local keyword filter so
// their results stay on-topic for the query.
const LOCAL_KEYWORD_FILTER = new Set(["arbeitnow", "themuse"]);

// Sources that ALREADY filter by country server-side (Adzuna per-country
// endpoint, JSearch "in <country>" query, Apify locationSearch). Re-applying a
// strict location-string match to these wrongly drops valid jobs whose location
// text doesn't literally contain the country name (e.g. Adzuna returns a state),
// so we trust their server-side country scoping instead.
const COUNTRY_FILTERED = new Set(["adzuna", "jsearch", "apify"]);

export type FetchMode = "live" | "background";

export type FetchOptions = {
  /** "live" = per-user on-demand: skips `scarce` sources to protect tiny quotas.
      "background" = the scheduled cron: includes them. */
  mode?: FetchMode;
  /** Per-provider result cap — bounds cost/latency. */
  perProvider?: number;
  /** Allow paid sources (Apify). Off by default so anonymous traffic and the
      background cron never spend the budget — set true only for signed-in
      on-demand searches. */
  includePaid?: boolean;
};

function usable(p: JobProvider, mode: FetchMode, includePaid: boolean): boolean {
  if (!p.isConfigured()) return false;
  if (p.scarce && mode !== "background") return false;
  if (p.paid && !includePaid) return false;
  return true;
}

/** Which sources are actually usable right now (for the "sources live" UI label). */
export function activeSources(mode: FetchMode = "live", includePaid = false): string[] {
  return PROVIDERS.filter((p) => usable(p, mode, includePaid)).map((p) => p.name);
}

function dedupeKey(j: RawJobPosting): string {
  // Same posting often appears across sources; key on company+title+first
  // location token so cross-source duplicates collapse to one card.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40);
  return `${norm(j.company)}|${norm(j.title)}|${norm(j.location).slice(0, 12)}`;
}

/** Fetch + normalize + filter + dedupe across all active providers. */
export async function fetchJobs(
  scope: SearchScope,
  opts: FetchOptions = {},
): Promise<RawJobPosting[]> {
  const mode = opts.mode ?? "live";
  const perProvider = opts.perProvider ?? 60;
  const includePaid = opts.includePaid ?? false;

  const chosen = PROVIDERS.filter((p) => usable(p, mode, includePaid));

  const settled = await Promise.allSettled(
    chosen.map((p) => p.fetchJobs(scope, perProvider)),
  );

  const seen = new Set<string>();
  const out: RawJobPosting[] = [];
  const kwTokens = scope.keywords.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const fetched: Record<string, number> = {};
  const kept: Record<string, number> = {};

  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value) {
      fetched[j.source] = (fetched[j.source] ?? 0) + 1;
      if (!j.title || !j.url) continue;
      if (isTooOld(j.postedAt, scope.datePosted)) continue;
      if (!matchesRemote(j.remote, scope.remote)) continue;
      // Only re-check country for sources that DON'T scope by country server-side.
      if (!COUNTRY_FILTERED.has(j.source) && !matchesCountry(j.country, j.location, scope.country)) continue;
      // Feeds with no server-side keyword filter: require a loose keyword hit
      // so results stay relevant to the query.
      if (kwTokens.length && LOCAL_KEYWORD_FILTER.has(j.source)) {
        const hay = `${j.title} ${j.description}`.toLowerCase();
        if (!kwTokens.some((t) => hay.includes(t))) continue;
      }
      const key = dedupeKey(j);
      if (seen.has(key)) continue;
      seen.add(key);
      kept[j.source] = (kept[j.source] ?? 0) + 1;
      out.push(j);
    }
  }
  // diagnostic (Vercel runtime logs) — shows exactly where results are lost
  console.log(
    `[jobmatch] country=${scope.country} remote=${scope.remote} date=${scope.datePosted} ` +
    `top=${scope.topCompaniesOnly ?? false} kw="${scope.keywords}" ` +
    `fetched=${JSON.stringify(fetched)} kept=${JSON.stringify(kept)} total=${out.length}`,
  );
  return out;
}
