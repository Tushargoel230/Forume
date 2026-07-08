/* Server-side LLM plumbing shared by /api/generate and /api/fix. */

export type LlmConfig = { baseUrl: string; apiKey: string; model: string };

// keep sequential calls inside Groq's free-tier 12k tokens/minute
export const CONTEXT_BUDGET = 11000;

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
  return JSON.parse(t.slice(start, end + 1)) as T;
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
