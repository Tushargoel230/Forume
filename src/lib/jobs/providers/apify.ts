/* Apify — the fantastic-jobs ATS API (direct-from-Workday/Greenhouse/Ashby/…).
   DORMANT by default: does nothing unless APIFY_TOKEN is set. This is the only
   PAID source (pay-per-result, ~$0.012/job + $0.01/run) and is left off so the
   app stays €0/month until you choose to fund it. When you do, add APIFY_TOKEN
   as a server-only Vercel env var — never NEXT_PUBLIC_*, same rule as LLM_API_KEY.

   Input mapping was verified against the actor's live input schema:
   timeRange (1h/24h/7d/6m — note: no "30d", so 30d uses datePostedAfter),
   titleSearch[], locationSearch[] ("City, State/Region, Country" English phrase),
   aiWorkArrangementFilter[] (On-site/Hybrid/Remote OK/Remote Solely). */

import type { JobProvider, RawJobPosting, RemotePref, SearchScope } from "../types";
import { countryLabel } from "../scope";
import { TOP_COMPANY_NAMES } from "../companies";
import { stripHtml } from "../util";

const ACTOR = "fantastic-jobs~career-site-job-listing-api";

// Per-run result cap. Apify bills per result (~$0.012/job), so this bounds the
// cost of a single search. Small on purpose to stretch the $5/mo free credits
// (~$0.30/search here); raise JOBS_APIFY_MAX only if you accept more spend.
const MAX_ITEMS = Number(process.env.JOBS_APIFY_MAX) || 25;

function token() { return process.env.APIFY_TOKEN?.trim(); }

function workArrangement(pref: RemotePref): string[] | undefined {
  if (pref === "remote") return ["Remote OK", "Remote Solely"];
  if (pref === "hybrid") return ["Hybrid"];
  if (pref === "onsite") return ["On-site"];
  return undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const apify: JobProvider = {
  name: "apify",
  isConfigured: () => Boolean(token()),
  paid: true, // pay-per-result — gated behind includePaid (signed-in on-demand only)

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const tk = token();
    if (!tk) return [];

    const input: Record<string, unknown> = {
      limit: Math.max(10, Math.min(limit, MAX_ITEMS)), // hard cap: cost is per-result
      descriptionType: "text",
      removeAgency: true, // drop recruitment-agency reposts — big quality win
      includeCompanyDetails: true, // LinkedIn/company data (logo etc.)
    };
    if (scope.datePosted === "30d") {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      input.datePostedAfter = since;
    } else {
      input.timeRange = scope.datePosted; // "24h" | "7d"
    }
    if (scope.keywords.trim()) input.titleSearch = [scope.keywords.trim()];
    if (scope.country !== "any" && scope.country !== "remote") {
      input.locationSearch = [countryLabel(scope.country)];
    }
    // "Top companies" filter → restrict to recognized big employers (org search).
    if (scope.topCompaniesOnly) input.organizationSearch = TOP_COMPANY_NAMES;
    const wa = workArrangement(scope.remote);
    if (wa) input.aiWorkArrangementFilter = wa;

    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${tk}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) return [];
      const rows = (await res.json()) as any[];
      return rows.map((j) => {
        const loc = j.locations_derived?.[0] || j.location || j.locations_raw?.[0]?.address?.addressLocality || "";
        return {
          source: "apify",
          sourceJobId: String(j.id ?? j.job_id ?? j.url),
          title: j.title ?? "",
          company: j.organization ?? j.company ?? j.organization_name ?? "",
          location: typeof loc === "string" ? loc : "",
          country: j.countries_derived?.[0] ?? "",
          description: stripHtml(String(j.description_text ?? j.description ?? "")),
          url: j.url ?? j.apply_url ?? "",
          postedAt: j.date_posted ?? j.date_created ?? null,
          salary: j.salary_raw ? String(j.salary_raw) : null,
          remote: j.ai_work_arrangement ? /remote/i.test(j.ai_work_arrangement) : null,
        } satisfies RawJobPosting;
      });
    } catch {
      return [];
    }
  },
};
