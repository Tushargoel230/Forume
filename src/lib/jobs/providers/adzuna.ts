/* Adzuna — free tier (email-only signup, NO card). This is the country-dropdown
   workhorse: a real per-country endpoint with keyword (`what`), location
   (`where`), and `max_days_old`. Stays dormant until ADZUNA_APP_ID + ADZUNA_APP_KEY
   are set, so the app runs on the zero-auth sources until you add a free key. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { adzunaCountry, daysForDate } from "../scope";
import { getJson, stripHtml } from "../util";

type AzJob = {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description: string;
  redirect_url: string;
  created: string; // ISO
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
};
type AzResponse = { results: AzJob[] };

function appId() { return process.env.ADZUNA_APP_ID?.trim(); }
function appKey() { return process.env.ADZUNA_APP_KEY?.trim(); }

function salaryText(j: AzJob): string | null {
  if (!j.salary_min && !j.salary_max) return null;
  const fmt = (n?: number) => (n ? Math.round(n).toLocaleString() : "?");
  return j.salary_min && j.salary_max ? `${fmt(j.salary_min)}–${fmt(j.salary_max)}` : fmt(j.salary_min || j.salary_max);
}

export const adzuna: JobProvider = {
  name: "adzuna",
  isConfigured: () => Boolean(appId() && appKey()),

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const id = appId();
    const key = appKey();
    if (!id || !key) return [];
    // Adzuna only covers specific countries; default to GB when the scope is
    // "any"/"remote" so the key still contributes a broad-net result set.
    const country = adzunaCountry(scope.country) ?? "gb";

    const params = new URLSearchParams({
      app_id: id,
      app_key: key,
      results_per_page: String(Math.min(limit, 50)),
      max_days_old: String(daysForDate(scope.datePosted)),
      // relevance when there's a query (better matches first), recency otherwise
      sort_by: scope.keywords.trim() ? "relevance" : "date",
      content_type: "application/json",
    });
    if (scope.keywords.trim()) params.set("what", scope.keywords.trim());
    if (scope.remote === "remote") params.set("what_or", "remote");

    try {
      const data = await getJson<AzResponse>(
        `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
      );
      return (data.results ?? []).map((j) => ({
        source: "adzuna",
        sourceJobId: j.id,
        title: j.title,
        company: j.company?.display_name || "",
        location: j.location?.display_name || "",
        country: j.location?.area?.[0] || country.toUpperCase(),
        description: stripHtml(j.description || ""),
        url: j.redirect_url,
        postedAt: j.created || null,
        salary: salaryText(j),
        remote: /remote/i.test(`${j.title} ${j.location?.display_name ?? ""}`) || null,
      }));
    } catch {
      return [];
    }
  },
};
