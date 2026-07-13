import { chat, extractJson, fallbackConfig, type LlmConfig } from "@/lib/llm";

/** Same primary→fallback retry shape used by /api/generate and /api/fix, reused by agents. */
export async function chatJsonWithFallback<T>(
  cfg: LlmConfig, system: string, user: string, temperature?: number,
): Promise<T> {
  try {
    return extractJson<T>(await chat(cfg, system, user, true, temperature));
  } catch (e) {
    const fb = fallbackConfig(cfg);
    if (!fb) throw e;
    return extractJson<T>(await chat(fb, system, user, true, temperature));
  }
}
