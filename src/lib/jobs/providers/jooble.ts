/* Jooble — free developer key (jooble.org/api/about). Aggregates corporate career
   pages, job boards, and newspapers, strong in Germany/EU. Dormant until
   JOOBLE_API_KEY is set. Note: Jooble returns a short SNIPPET, not the full job
   description, so its match scores skew lower — it's coverage, not depth; the
   ranking surfaces full-description hits above it. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { countryLabel } from "../scope";
import { stripHtml } from "../util";

type JoobleJob = {
  id?: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
};
type JoobleResponse = { jobs?: JoobleJob[] };

function key() { return process.env.JOOBLE_API_KEY?.trim(); }

export const jooble: JobProvider = {
  name: "jooble",
  isConfigured: () => Boolean(key()),

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const k = key();
    if (!k) return [];
    const location = scope.country !== "any" && scope.country !== "remote"
      ? countryLabel(scope.country)
      : "";

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(`https://jooble.org/api/${k}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: scope.keywords.trim() || "engineer", location, page: "1" }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.log(`[jooble] HTTP ${res.status}`);
        return [];
      }
      const data = (await res.json()) as JoobleResponse;
      return (data.jobs ?? []).slice(0, limit).map((j) => ({
        source: "jooble",
        sourceJobId: String(j.id ?? j.link),
        title: j.title,
        company: j.company || j.source || "",
        location: j.location || "",
        country: j.location || "",
        description: stripHtml(j.snippet || ""),
        url: j.link,
        postedAt: j.updated || null,
        salary: j.salary || null,
        remote: /remote/i.test(`${j.title} ${j.location ?? ""}`) || null,
      }));
    } catch {
      return [];
    } finally {
      clearTimeout(t);
    }
  },
};
