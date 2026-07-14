import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

const MARKETING_SYSTEM = `You are Forume's growth analyst. Forume is a free AI resume + cover-letter tool for students and job-seekers, launched at TU Dortmund, with a European CV angle. You read real usage data and propose concrete, low-cost, student-friendly marketing moves for a solo founder. No paid ads. Never invent a number you weren't given.`;

const marketingUser = (stats: string) => `
Real usage data as JSON:

<data>
${stats}
</data>

Return JSON with exactly these keys:
- "read": one honest sentence on where growth stands (accelerating, flat, stalled)
- "ideas": array of 2-4 concrete, cheap growth actions tailored to a student founder (campus channels, WhatsApp groups, a specific reel concept tied to the data, a subreddit, career-center outreach) — each a short imperative sentence
- "needs_human": true only if growth has clearly stalled (near-zero new signups over the last week) and warrants attention

Return only JSON.`;

type Marketing = { read: string; ideas: string[]; needs_human: boolean };

export const marketingAnalytics: Agent = async (ctx) => {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const prevWeek = new Date(now - 14 * 864e5).toISOString();

  const [appsWeek, usersPage] = await Promise.all([
    ctx.supabase.from("applications").select("ats, template, created_at").gte("created_at", weekAgo),
    ctx.supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const users = usersPage.data?.users ?? [];
  const signupsWeek = users.filter((u) => u.created_at >= weekAgo).length;
  const signupsPrevWeek = users.filter((u) => u.created_at >= prevWeek && u.created_at < weekAgo).length;

  const apps = appsWeek.data ?? [];
  const templateCounts: Record<string, number> = {};
  const fitCounts: Record<string, number> = {};
  for (const a of apps) {
    const tpl = (a as { template?: string }).template;
    if (tpl) templateCounts[tpl] = (templateCounts[tpl] ?? 0) + 1;
    const level = (a.ats as { fit?: { level?: string } } | null)?.fit?.level;
    if (level) fitCounts[level] = (fitCounts[level] ?? 0) + 1;
  }

  const stats = {
    signups_last_7d: signupsWeek,
    signups_prev_7d: signupsPrevWeek,
    total_users: users.length,
    generations_last_7d: apps.length,
    popular_templates_7d: templateCounts,
    fit_distribution_7d: fitCounts,
  };

  if (!ctx.llm) {
    const needsHuman = signupsWeek === 0;
    return { summary: `Marketing (no LLM): ${JSON.stringify(stats)}`, data: stats, needsHuman };
  }

  const out = await chatJsonWithFallback<Marketing>(ctx.llm, MARKETING_SYSTEM, marketingUser(JSON.stringify(stats, null, 1)));
  return {
    summary: `${out.read} Ideas: ${(out.ideas ?? []).join(" · ")}`,
    data: { stats, ideas: out.ideas },
    needsHuman: Boolean(out.needs_human),
  };
};
