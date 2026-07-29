/* Arbeitnow — free, no API key. A flat job-board feed (Europe/Germany-heavy)
   with a `remote` flag. No server-side keyword/country filtering, so we page a
   little and filter locally in the orchestrator. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { getJson, stripHtml } from "../util";

type AnJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // unix seconds
};
type AnResponse = { data: AnJob[]; links?: { next?: string | null } };

export const arbeitnow: JobProvider = {
  name: "arbeitnow",
  isConfigured: () => true, // no credential needed

  async fetchJobs(_scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const out: RawJobPosting[] = [];
    // Each page returns ~100 rows; one page is plenty for a match run.
    const pages = Math.min(2, Math.ceil(limit / 100) || 1);
    for (let page = 1; page <= pages; page++) {
      try {
        const data = await getJson<AnResponse>(
          `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        );
        for (const j of data.data ?? []) {
          out.push({
            source: "arbeitnow",
            sourceJobId: j.slug,
            title: j.title,
            company: j.company_name,
            location: j.location || "",
            country: j.location || "",
            description: stripHtml(j.description || ""),
            url: j.url,
            postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
            salary: null,
            remote: typeof j.remote === "boolean" ? j.remote : null,
          });
        }
        if (!data.links?.next) break;
      } catch {
        break; // degrade gracefully — a dead source must never break the search
      }
    }
    return out;
  },
};
