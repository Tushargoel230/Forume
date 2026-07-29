/* Remotive — free, no API key, remote jobs only. Supports a `search` term.
   Marked `scarce`: Remotive asks callers to hit it at most ~4×/day globally, so
   the orchestrator keeps it OUT of per-user on-demand calls and lets the
   scheduled background refresh (every 6h = 4×/day) populate the cache instead.
   Their terms require attribution + linking back, which the UI honors via the
   "View posting" link and the source label. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { getJson, stripHtml } from "../util";

type RmJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string; // ISO
  candidate_required_location: string;
  salary: string;
  description: string;
};
type RmResponse = { jobs: RmJob[] };

export const remotive: JobProvider = {
  name: "remotive",
  isConfigured: () => true,
  scarce: true,

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) });
    if (scope.keywords.trim()) params.set("search", scope.keywords.trim());
    try {
      const data = await getJson<RmResponse>(`https://remotive.com/api/remote-jobs?${params}`);
      return (data.jobs ?? []).map((j) => ({
        source: "remotive",
        sourceJobId: String(j.id),
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        country: j.candidate_required_location || "Remote",
        description: stripHtml(j.description || ""),
        url: j.url,
        postedAt: j.publication_date || null,
        salary: j.salary || null,
        remote: true,
      }));
    } catch {
      return [];
    }
  },
};
