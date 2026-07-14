/* Server-side LLM plumbing shared by /api/generate and /api/fix. */

import type { Resume } from "./types";

export type LlmConfig = { baseUrl: string; apiKey: string; model: string };

// Character budget for the candidate background packed into each prompt.
// Default fits Groq's free-tier ~12k tokens/minute; raise LLM_CONTEXT_BUDGET
// when pointing LLM_BASE_URL at a large-context provider (e.g. Gemini free tier
// via its OpenAI-compatible endpoint) so long resumes are no longer truncated.
export const CONTEXT_BUDGET = Number(process.env.LLM_CONTEXT_BUDGET) || 11000;

// Cap output so a runaway completion can't get provider-side truncated into
// invalid JSON. A one-page resume JSON fits comfortably under 4k tokens.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || 4096;

export function llmConfigFromEnv(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !model) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey: process.env.LLM_API_KEY ?? "", model };
}

export function fallbackConfig(primary: LlmConfig): LlmConfig | null {
  const model = process.env.LLM_FALLBACK_MODEL;
  if (!model || model === primary.model) return null;
  return {
    baseUrl: (process.env.LLM_FALLBACK_BASE_URL ?? primary.baseUrl).replace(/\/$/, ""),
    apiKey: process.env.LLM_FALLBACK_API_KEY ?? primary.apiKey,
    model,
  };
}

export async function chat(
  cfg: LlmConfig, system: string, user: string, jsonMode: boolean, temperature?: number,
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        temperature: temperature ?? (jsonMode ? 0.4 : 0.7),
        max_tokens: MAX_TOKENS,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices[0].message.content as string;
    }
    const text = (await res.text()).slice(0, 300);
    // per-minute rate limits clear quickly: honor Retry-After (capped) and retry twice
    if (res.status === 429 && attempt < 2) {
      const retryAfter = Number(res.headers.get("retry-after")) || 8;
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 20) * 1000));
      continue;
    }
    throw new Error(`LLM returned ${res.status}: ${text}`);
  }
}

export function extractJson<T>(text: string): T {
  let t = text.trim();
  if (t.startsWith("```")) t = t.split("```")[1].replace(/^json/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // light repair: strip trailing commas before } or ] (a common model slip)
    const repaired = slice.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(repaired) as T;
  }
}

/* Normalize a parsed resume object into a valid Resume shape so a missing or
   mistyped key from the model never crashes rendering or ATS scoring. */
export function coerceResume(raw: unknown): Resume {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const arr = <U>(v: unknown, map: (x: Record<string, unknown>) => U): U[] =>
    Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => map(x as Record<string, unknown>)) : [];
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    headline: str(o.headline),
    summary: str(o.summary),
    skills: arr(o.skills, (g) => ({ category: str(g.category), items: strList(g.items) })),
    experience: arr(o.experience, (j) => ({
      title: str(j.title), company: str(j.company), location: str(j.location),
      dates: str(j.dates), bullets: strList(j.bullets),
    })),
    projects: arr(o.projects, (p) => ({
      name: str(p.name), tech: str(p.tech), bullets: strList(p.bullets),
    })),
    education: arr(o.education, (e) => ({
      degree: str(e.degree), school: str(e.school), dates: str(e.dates), details: str(e.details),
    })),
    certifications: strList(o.certifications),
  };
}

export function friendlyLlmError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes(" 429")) {
    return "The writing engine is at capacity right now — try again in a minute.";
  }
  if (msg.includes(" 401") || msg.includes(" 403")) {
    return "The writing engine rejected the request — please try again later.";
  }
  return `Generation failed: ${msg}`;
}
