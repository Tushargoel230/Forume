/* Job ↔ resume matching. Two passes, mirroring the app's honesty-first design:

   1. A cheap DETERMINISTIC keyword-overlap score (no AI), reusing the exact
      normalization + synonym logic the ATS scorer already uses (lib/ats.ts).
   2. An OPTIONAL LLM refinement for the top-N candidates that produces the same
      five-band `FitLevel` verdict + 2–4 blunt reasons as /api/generate's
      analysis stage — same voice, same "judge the person, not the draft" rule.

   The background text is the user's own uploaded documents (plain text), never
   invented — identical source-of-truth constraint as the rest of Forume. */

import { normalize, keywordPresent } from "./ats";
import { chat, extractJson, friendlyLlmError, type LlmConfig } from "./llm";
import type { Fit, FitLevel } from "./types";

/* --- deterministic pass ------------------------------------------------- */

// Common words that carry no matching signal. Kept small on purpose — the
// synonym expansion in ats.ts does the heavy lifting for real skill terms.
const STOPWORDS = new Set(
  ("a an and or the of to in for on with at by from as is are be we you our your " +
    "will can role team work working experience years year job about who what this " +
    "that these those have has had they them their it its into over under across " +
    "strong ideal candidate looking help ship shape turn bring able across plus " +
    "more most other than then also within per via etc us do does new join build " +
    "including include includes required requirements responsibilities preferred " +
    "nice must should would could like well good great high low using use used " +
    "day days across company companies career opportunity opportunities apply " +
    // job-posting boilerplate — pure noise that drags every score down
    "benefits benefit compensation salary equal employer diversity inclusion inclusive " +
    "applicants applicant hire hiring position positions candidates skills skill ability " +
    "abilities knowledge understanding excellent responsible duties qualifications qualified " +
    "degree bachelor master phd environment culture fast paced growth grow mission passion " +
    "passionate seeking make impact difference people person team teams world class benefits " +
    "flexible paid leave insurance health remote hybrid onsite office location offices " +
    "communication collaborate collaboration collaborative stakeholders cross functional " +
    "excellent proven track record self starter detail oriented problem solving fast learner " +
    "responsibilities requirements preferred bonus perks vacation pto")
    .split(" "),
);

/** Pull the salient terms from a job description: the deterministic signal we
    score against. Keeps multi-word tech phrases (bigrams) and meaningful
    unigrams, ranked by frequency, capped so scoring stays cheap and stable. */
export function extractJobKeywords(jobText: string, max = 18): string[] {
  const norm = normalize(jobText); // " padded lowercase alnum+#+ tokens "
  const tokens = norm.trim().split(" ").filter(Boolean);
  const freq = new Map<string, number>();

  const bump = (term: string) => {
    if (!term || term.length < 2) return;
    freq.set(term, (freq.get(term) ?? 0) + 1);
  };

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    if (!STOPWORDS.has(w) && !/^\d+$/.test(w)) bump(w);
    // bigrams like "machine learning", "control systems" — only when neither
    // half is a stopword, so we don't manufacture noise phrases.
    const next = tokens[i + 1];
    if (next && !STOPWORDS.has(w) && !STOPWORDS.has(next) && !/^\d+$/.test(w) && !/^\d+$/.test(next)) {
      bump(`${w} ${next}`);
    }
  }

  return [...freq.entries()]
    // favour rarer-but-present multiword phrases, then frequency
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([term]) => term)
    .slice(0, max);
}

export type OverlapResult = {
  score: number; // 0–100 keyword coverage of the JD by the background
  matched: string[];
  missing: string[];
};

/** Deterministic overlap of a job's key terms against the user's background. */
export function overlapScore(backgroundText: string, jobText: string): OverlapResult {
  const keywords = extractJobKeywords(jobText);
  const normBg = normalize(backgroundText);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    (keywordPresent(normBg, kw) ? matched : missing).push(kw);
  }
  const score = keywords.length ? Math.round((100 * matched.length) / keywords.length) : 0;
  return { score, matched, missing };
}

/** Map a raw 0–100 overlap to the five-band verdict, so even without the LLM
    pass every card shows an honest band (refined later for the top matches). */
export function bandFromScore(score: number): FitLevel {
  // Calibrated for keyword-overlap scores after boilerplate removal: a genuinely
  // relevant role typically lands 30–60% overlap, so those read as fair/good,
  // not "long shot". Only real matches clear 60.
  if (score >= 60) return "strong";
  if (score >= 45) return "good";
  if (score >= 30) return "fair";
  if (score >= 16) return "stretch";
  return "weak";
}

/* --- optional LLM refinement pass -------------------------------------- */

const REFINE_SYSTEM =
  "You are a blunt, experienced recruiter judging whether a candidate is a real " +
  "fit for a job, using ONLY the facts in their background. Never invent experience. " +
  "Judge the person's actual interview chances, not how a resume could be worded. " +
  'Return strict JSON: {"level":"strong|good|fair|stretch|weak","reasons":["…"]} ' +
  "with 2–4 short, concrete, honest reasons (name real overlaps and real gaps).";

/** Refine one job's fit with a single low-token LLM call. Falls back to the
    deterministic band on any failure so a match is never blocked by the engine. */
export async function refineFit(
  cfg: LlmConfig,
  backgroundText: string,
  job: { title: string; company: string; description: string },
  fallbackScore: number,
): Promise<Fit> {
  const user =
    `BACKGROUND (the candidate's real, only-allowed facts):\n${backgroundText.slice(0, 6000)}\n\n` +
    `JOB: ${job.title} at ${job.company}\n${job.description.slice(0, 3500)}`;
  try {
    const raw = await chat(cfg, REFINE_SYSTEM, user, true, 0.3);
    const parsed = extractJson<{ level?: string; reasons?: unknown }>(raw);
    const levels: FitLevel[] = ["strong", "good", "fair", "stretch", "weak"];
    const level = levels.includes(parsed.level as FitLevel)
      ? (parsed.level as FitLevel)
      : bandFromScore(fallbackScore);
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((r): r is string => typeof r === "string").slice(0, 4)
      : [];
    return { level, reasons: reasons.length ? reasons : ["Based on keyword overlap with your background."] };
  } catch (e) {
    // stay silent-but-honest: deterministic band, no fabricated reasons
    void friendlyLlmError(e);
    return { level: bandFromScore(fallbackScore), reasons: ["Scored on keyword overlap with your background."] };
  }
}
