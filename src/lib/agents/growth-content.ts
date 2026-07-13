import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

const CONTENT_SYSTEM = `You are Forume's content strategist. You write short-form video concepts (Instagram Reels / TikTok) for a free, honest AI resume-tailoring tool built by a solo student founder for other students. The brand voice is direct and a little irreverent about "AI slop" resumes — Forume's whole pitch is that it only uses real facts from your documents, never invented experience. Ground every idea in the real product-usage signal you're given; never invent a statistic.`;

const contentUser = (signal: string, n: number) => `
Here is real, anonymized product signal from the last 14 days as JSON:

<signal>
${signal}
</signal>

Draft ${n} short-form video concepts (30-60 seconds each) that a solo founder could film on a phone. Ground each idea in something from the signal above — a common gap, a popular template, a fit-verdict pattern — don't write generic "AI resume tool" content.

Respond with a JSON object with exactly one key "concepts", an array of ${n} objects, each with:
- "platform": "instagram" or "tiktok"
- "hook": the first line on screen, under 12 words, has to stop a scroll
- "script_beats": 3-5 short numbered beats describing what happens/is said, plain text
- "on_screen_text": short text overlay ideas, plain text
- "caption": a ready-to-post caption, 1-3 sentences
- "hashtags": array of 5-8 relevant hashtags, no # symbol

Return only JSON.`;

type ContentDraft = {
  platform: string;
  hook: string;
  script_beats: string;
  on_screen_text: string;
  caption: string;
  hashtags: string[];
};

/** Ideation + copy only — never posts. Founder reviews drafts in /admin,
    approves, then films/edits/posts manually. */
export const growthContent: Agent = async (ctx) => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: apps } = await ctx.supabase
    .from("applications")
    .select("template, ats")
    .gte("created_at", fourteenDaysAgo);

  const rows = apps ?? [];
  const templateCounts: Record<string, number> = {};
  const fitCounts: Record<string, number> = {};
  const missingKeywordCounts: Record<string, number> = {};

  for (const row of rows) {
    if (row.template) templateCounts[row.template] = (templateCounts[row.template] ?? 0) + 1;
    const ats = row.ats as { fit?: { level?: string }; keywords_missing?: string[] } | null;
    const level = ats?.fit?.level;
    if (level) fitCounts[level] = (fitCounts[level] ?? 0) + 1;
    for (const kw of ats?.keywords_missing ?? []) {
      const key = kw.toLowerCase();
      missingKeywordCounts[key] = (missingKeywordCounts[key] ?? 0) + 1;
    }
  }

  const topMissingKeywords = Object.entries(missingKeywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw, count]) => ({ keyword: kw, times_missing: count }));

  const signal = {
    applications_last_14_days: rows.length,
    template_popularity: templateCounts,
    fit_distribution: fitCounts,
    most_common_missing_keywords: topMissingKeywords,
  };

  if (rows.length < 5) {
    return {
      summary: "Not enough usage data yet (fewer than 5 applications in 14 days) — skipped content drafting.",
      data: { signal },
      needsHuman: false,
    };
  }
  if (!ctx.llm) {
    return { summary: "Content agent skipped — LLM not configured.", data: { signal }, needsHuman: false };
  }

  const N = 3;
  const { concepts } = await chatJsonWithFallback<{ concepts: ContentDraft[] }>(
    ctx.llm, CONTENT_SYSTEM, contentUser(JSON.stringify(signal, null, 1), N), 0.8,
  );

  const toInsert = concepts.map((c) => ({
    platform: c.platform === "tiktok" ? "tiktok" : "instagram",
    hook: c.hook,
    script_beats: c.script_beats,
    on_screen_text: c.on_screen_text,
    caption: c.caption,
    hashtags: c.hashtags ?? [],
    source_signal: signal,
    status: "draft",
  }));
  const { error } = await ctx.supabase.from("content_queue").insert(toInsert);
  if (error) throw new Error(`Failed to save content drafts: ${error.message}`);

  return {
    summary: `Drafted ${toInsert.length} content idea(s) grounded in the last 14 days of usage — ready for review in /admin.`,
    data: { signal },
    needsHuman: true,
  };
};
