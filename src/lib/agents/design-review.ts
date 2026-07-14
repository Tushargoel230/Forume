import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

const DESIGN_SYSTEM = `You are Forume's product-design reviewer. You turn real user feedback that touches usability or visual design into a short, prioritized punch-list for a solo founder. Be specific and actionable; tie each item to what a user actually said. Never invent feedback that wasn't provided.`;

const designUser = (feedback: string) => `
Here are recent user messages that mention the interface, usability, or look (JSON array):

<feedback>
${feedback}
</feedback>

Return JSON with exactly these keys:
- "themes": array of 1-4 short strings naming the recurring UX/design issues
- "punch_list": array of 1-5 concrete, prioritized fixes (each a short imperative sentence)
- "needs_human": true if any item points to a broken or confusing flow that costs users

Return only JSON.`;

const UI_HINTS = /\b(ui|ux|design|layout|button|confus|hard to|difficult|ugly|looks?|slow|broken|can'?t find|where is|navigat|mobile|screen|font|color|cluttered)\b/i;

type DesignOut = { themes: string[]; punch_list: string[]; needs_human: boolean };

export const designReview: Agent = async (ctx) => {
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await ctx.supabase
    .from("feedback")
    .select("raw_message, created_at")
    .gte("created_at", monthAgo)
    .order("created_at", { ascending: false })
    .limit(200);

  const design = (data ?? [])
    .map((f) => (f as { raw_message?: string }).raw_message ?? "")
    .filter((m) => m && UI_HINTS.test(m))
    .slice(0, 40);

  if (design.length === 0) {
    return {
      summary: "No design/UX-related feedback in the last 30 days. Nothing to action from users; proceed with the planned design roadmap.",
      data: { design_feedback_count: 0 },
      needsHuman: false,
    };
  }

  if (!ctx.llm) {
    return {
      summary: `${design.length} design/UX-related messages in the last 30 days (no LLM configured to synthesize).`,
      data: { design_feedback_count: design.length, messages: design },
      needsHuman: false,
    };
  }

  const out = await chatJsonWithFallback<DesignOut>(ctx.llm, DESIGN_SYSTEM, designUser(JSON.stringify(design, null, 1)));
  return {
    summary: `Themes: ${(out.themes ?? []).join(", ")}. Punch-list: ${(out.punch_list ?? []).join(" · ")}`,
    data: { design_feedback_count: design.length, ...out },
    needsHuman: Boolean(out.needs_human),
  };
};
