/* Turns the UI scope (country dropdown, remote toggle, date filter) into the
   concrete parameters each provider actually accepts. Kept in one place because
   the providers disagree on shape (Adzuna has a real country code + max_days_old;
   Arbeitnow/Remotive are flat feeds we filter ourselves). */

import type { DatePosted, RemotePref, SearchScope } from "./types";

/** Countries offered in the dropdown. `adzuna` is Adzuna's country code
    (its API only covers these); others are filtered by location string.
    "any" and "remote" are handled specially by the orchestrator. */
export const COUNTRIES: { code: string; label: string; adzuna?: string }[] = [
  { code: "any", label: "Anywhere" },
  { code: "remote", label: "Remote (worldwide)" },
  { code: "de", label: "Germany", adzuna: "de" },
  { code: "gb", label: "United Kingdom", adzuna: "gb" },
  { code: "us", label: "United States", adzuna: "us" },
  { code: "nl", label: "Netherlands", adzuna: "nl" },
  { code: "fr", label: "France", adzuna: "fr" },
  { code: "ch", label: "Switzerland", adzuna: "ch" },
  { code: "at", label: "Austria", adzuna: "at" },
  { code: "ca", label: "Canada", adzuna: "ca" },
  { code: "au", label: "Australia", adzuna: "au" },
  { code: "in", label: "India", adzuna: "in" },
  { code: "es", label: "Spain", adzuna: "es" },
  { code: "it", label: "Italy", adzuna: "it" },
  { code: "pl", label: "Poland", adzuna: "pl" },
  { code: "se", label: "Sweden", adzuna: "se" },
  { code: "sg", label: "Singapore", adzuna: "sg" },
];

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code.toUpperCase();
}

export function adzunaCountry(code: string): string | null {
  return COUNTRIES.find((c) => c.code === code)?.adzuna ?? null;
}

/** Days implied by the date filter (used by feeds we filter ourselves and by
    Adzuna's max_days_old). */
export function daysForDate(d: DatePosted): number {
  return d === "24h" ? 1 : d === "7d" ? 7 : 30;
}

/** True if a posting older than the scope's window should be dropped. */
export function isTooOld(postedAt: string | null, date: DatePosted): boolean {
  if (!postedAt) return false; // unknown date — keep, don't guess it away
  const ms = Date.parse(postedAt);
  if (Number.isNaN(ms)) return false;
  const cutoff = Date.now() - daysForDate(date) * 24 * 60 * 60 * 1000;
  return ms < cutoff;
}

/** Whether a posting's remote flag satisfies the toggle. `null` (unknown) is
    kept for "any" but excluded from a strict remote/onsite filter. */
export function matchesRemote(remote: boolean | null, pref: RemotePref): boolean {
  if (pref === "any") return true;
  if (pref === "remote") return remote === true;
  if (pref === "onsite") return remote === false;
  return true; // "hybrid" isn't reliably distinguishable in free feeds → don't over-filter
}

/** Does a posting's country/location match the chosen country? */
export function matchesCountry(country: string, location: string, code: string): boolean {
  if (code === "any" || code === "remote") return true;
  const hay = `${country} ${location}`.toLowerCase();
  const label = countryLabel(code).toLowerCase();
  return hay.includes(code.toLowerCase()) || hay.includes(label);
}

/** A compact human summary of the scope for freshness/source labels. */
export function describeScope(s: SearchScope): string {
  const where = s.country === "any" ? "anywhere" : countryLabel(s.country);
  const remote = s.remote === "any" ? "" : ` · ${s.remote}`;
  return `${s.keywords || "your resume"} · ${where}${remote} · last ${s.datePosted}`;
}
