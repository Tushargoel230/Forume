/* Application-tracker helpers — the search funnel vocabulary and the "gone quiet"
   rule. Pure functions, no LLM calls: the tracker is free to run. */

import type { AppStatus, Application } from "./types";

/** Full status vocabulary, in the order shown in the per-application dropdown. */
export const STATUS_ORDER: AppStatus[] = [
  "saved", "drafted", "applied", "interviewing", "offer", "hired", "rejected", "no_response",
];

export const STATUS_LABEL: Record<AppStatus, string> = {
  saved: "Saved",
  drafted: "Drafted",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  no_response: "No response",
};

/** The pipeline stages shown as the funnel (the sellable placement numbers). */
export const FUNNEL: AppStatus[] = ["drafted", "applied", "interviewing", "offer", "hired"];

/** Statuses that count as "actively in progress". */
export const OPEN_STATUSES: AppStatus[] = ["applied", "interviewing", "offer"];

/** An application with no explicit status is a freshly drafted one. */
export function statusOf(a: Application): AppStatus {
  return a.status ?? "drafted";
}

/** Count applications by status (for the funnel tiles). */
export function funnelCounts(apps: Application[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const a of apps) {
    const s = statusOf(a);
    c[s] = (c[s] ?? 0) + 1;
  }
  return c;
}

const QUIET_DAYS = 10;

/** True if a live application (applied/interviewing) has had no update in a while
    — the signal to nudge a follow-up. */
export function isQuiet(a: Application): boolean {
  const s = statusOf(a);
  if (s !== "applied" && s !== "interviewing") return false;
  const t = Date.parse(a.last_activity_at ?? a.created_at);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > QUIET_DAYS * 24 * 60 * 60 * 1000;
}
