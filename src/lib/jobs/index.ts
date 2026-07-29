/* Orchestrator: fans a scope out to every configured provider in priority
   order, normalizes, filters against the scope, de-duplicates, and returns a
   single RawJobPosting[]. The matching engine and the API routes talk only to
   this — providers can be added/removed without touching anything else. */

import type { JobProvider, RawJobPosting, SearchScope } from "./types";
import { isTooOld, matchesCountry, matchesRemote } from "./scope";
import { apify } from "./providers/apify";
import { adzuna } from "./providers/adzuna";
import { arbeitnow } from "./providers/arbeitnow";
import { remotive } from "./providers/remotive";

// Priority order: paid ATS first (if funded), then the free country source,
// then the zero-auth feeds. Dedup keeps the earliest (highest-priority) hit.
const PROVIDERS: JobProvider[] = [apify, adzuna, arbeitnow, remotive];

export type FetchMode = "live" | "background";

export type FetchOptions = {
  /** "live" = per-user on-demand: skips `scarce` sources to protect tiny quotas.
      "background" = the scheduled cron: includes them. */
  mode?: FetchMode;
  /** Per-provider result cap — bounds cost/latency. */
  perProvider?: number;
};

/** Which sources are actually usable right now (for the "sources live" UI label). */
export function activeSources(mode: FetchMode = "live"): string[] {
  return PROVIDERS.filter((p) => p.isConfigured() && (mode === "background" || !p.scarce)).map(
    (p) => p.name,
  );
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

  const chosen = PROVIDERS.filter(
    (p) => p.isConfigured() && (mode === "background" || !p.scarce),
  );

  const settled = await Promise.allSettled(
    chosen.map((p) => p.fetchJobs(scope, perProvider)),
  );

  const seen = new Set<string>();
  const out: RawJobPosting[] = [];
  const kwTokens = scope.keywords.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value) {
      if (!j.title || !j.url) continue;
      if (isTooOld(j.postedAt, scope.datePosted)) continue;
      if (!matchesRemote(j.remote, scope.remote)) continue;
      if (!matchesCountry(j.country, j.location, scope.country)) continue;
      // Feeds with no server-side keyword filter (Arbeitnow): require a loose
      // keyword hit so results stay relevant to the query.
      if (kwTokens.length && j.source === "arbeitnow") {
        const hay = `${j.title} ${j.description}`.toLowerCase();
        if (!kwTokens.some((t) => hay.includes(t))) continue;
      }
      const key = dedupeKey(j);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(j);
    }
  }
  return out;
}
