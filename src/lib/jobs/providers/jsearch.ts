/* JSearch (RapidAPI) — aggregates Google for Jobs (LinkedIn, Indeed, company
   sites…), so it has excellent coverage INCLUDING big companies (NVIDIA, Apple,
   Google, Meta…). FREE tier: ~200 requests/month, free key, no card — this is
   the best free quality upgrade. Dormant until RAPIDAPI_KEY is set; degrades
   gracefully (returns []) when the monthly quota is spent. Not `paid` — no
   per-result billing, just a monthly request quota. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { countryLabel } from "../scope";
import { stripHtml } from "../util";

type JsJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link: string;
  job_description: string;
  job_posted_at_datetime_utc?: string;
  job_is_remote?: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
};
type JsResponse = { data?: JsJob[] };

function key() { return process.env.RAPIDAPI_KEY?.trim(); }

function datePosted(d: SearchScope["datePosted"]): string {
  return d === "24h" ? "today" : d === "7d" ? "week" : "month";
}

function salaryText(j: JsJob): string | null {
  if (!j.job_min_salary && !j.job_max_salary) return null;
  const cur = j.job_salary_currency ? `${j.job_salary_currency} ` : "";
  const fmt = (n?: number) => (n ? Math.round(n).toLocaleString() : "?");
  return `${cur}${fmt(j.job_min_salary)}–${fmt(j.job_max_salary)}`;
}

export const jsearch: JobProvider = {
  name: "jsearch",
  isConfigured: () => Boolean(key()),

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const k = key();
    if (!k) return [];
    // JSearch takes a natural-language query; fold location into it.
    const parts = [scope.keywords.trim() || "engineer"];
    if (scope.country !== "any" && scope.country !== "remote") parts.push(`in ${countryLabel(scope.country)}`);
    if (scope.remote === "remote") parts.push("remote");
    const query = parts.join(" ");
    // One page (~10 results) keeps latency low and conserves the free monthly
    // request quota (num_pages multiplies request cost).
    const params = new URLSearchParams({
      query,
      page: "1",
      num_pages: "1",
      date_posted: datePosted(scope.datePosted),
    });
    if (scope.remote === "remote") params.set("remote_jobs_only", "true");

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: { "X-RapidAPI-Key": k, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
        signal: ctrl.signal,
      });
      if (!res.ok) return []; // quota spent / error → fall back to other sources
      const data = (await res.json()) as JsResponse;
      return (data.data ?? []).map((j) => ({
        source: "jsearch",
        sourceJobId: j.job_id,
        title: j.job_title,
        company: j.employer_name,
        location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
        country: j.job_country || "",
        description: stripHtml(j.job_description || ""),
        url: j.job_apply_link,
        postedAt: j.job_posted_at_datetime_utc || null,
        salary: salaryText(j),
        remote: typeof j.job_is_remote === "boolean" ? j.job_is_remote : null,
      }));
    } catch {
      return [];
    } finally {
      clearTimeout(t);
    }
  },
};
