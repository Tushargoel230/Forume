/* The Muse — free, no API key. 100k+ curated roles from real companies
   (includes big employers). No free-text search, so we fetch by category
   (derived from the query) and let the orchestrator's local keyword filter +
   ranking do the relevance work. */

import type { JobProvider, RawJobPosting, SearchScope } from "../types";
import { getJson, stripHtml } from "../util";

type MuseJob = {
  name: string;
  company?: { name?: string };
  locations?: { name?: string }[];
  refs?: { landing_page?: string };
  contents?: string;
  publication_date?: string;
  levels?: { name?: string }[];
  id?: number;
};
type MuseResponse = { results?: MuseJob[]; page_count?: number };

/** Map the query to Muse categories. Defaults to the tech set (Forume's core
    audience); broadens for other domains so non-engineers still get results. */
function categoriesFor(keywords: string): string[] {
  const k = keywords.toLowerCase();
  const cats = new Set<string>();
  if (/\b(design|ux|ui)\b/.test(k)) cats.add("Design and UX");
  if (/\b(product manager|product management|\bpm\b)\b/.test(k)) cats.add("Product Management");
  if (/\b(market|growth|seo|content|brand)\b/.test(k)) cats.add("Marketing");
  if (/\b(sales|account executive|business development)\b/.test(k)) cats.add("Sales");
  if (/\b(data|analytics|scientist|ml|machine learning|\bai\b)\b/.test(k)) cats.add("Data Science");
  if (/\b(software|engineer|developer|robotics|backend|frontend|devops|sre|firmware|embedded)\b/.test(k) || cats.size === 0) {
    cats.add("Software Engineering");
    cats.add("Data Science");
  }
  return [...cats];
}

export const themuse: JobProvider = {
  name: "themuse",
  isConfigured: () => true, // no credential needed

  async fetchJobs(scope: SearchScope, limit: number): Promise<RawJobPosting[]> {
    const categories = categoriesFor(scope.keywords);
    const pages = 1; // one page keeps latency low; ranking surfaces the best
    const catParam = categories.map((c) => `category=${encodeURIComponent(c)}`).join("&");
    const out: RawJobPosting[] = [];

    for (let page = 1; page <= pages; page++) {
      try {
        const data = await getJson<MuseResponse>(
          `https://www.themuse.com/api/public/jobs?${catParam}&page=${page}`,
        );
        for (const j of data.results ?? []) {
          const loc = (j.locations ?? []).map((l) => l.name).filter(Boolean).join("; ");
          out.push({
            source: "themuse",
            sourceJobId: String(j.id ?? j.refs?.landing_page ?? j.name),
            title: j.name,
            company: j.company?.name || "",
            location: loc,
            country: loc,
            description: stripHtml(j.contents || ""),
            url: j.refs?.landing_page || "",
            postedAt: j.publication_date || null,
            salary: null,
            remote: /remote|flexible/i.test(loc) || null,
          });
        }
        if ((data.page_count ?? 1) <= page) break;
      } catch {
        break;
      }
    }
    return out;
  },
};
