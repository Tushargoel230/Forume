import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

const DIGEST_SYSTEM = `You are Forume's ops analyst. You read raw usage metrics and write a short, honest daily digest for the founder — a solo, pre-revenue student building this. Be concrete, name numbers, and flag anything that needs their attention. Never invent a number that wasn't given to you.`;

const digestUser = (stats: string) => `
Here are today's and this week's raw metrics as JSON:

<metrics>
${stats}
</metrics>

Write a digest with exactly these JSON keys:
- "headline": one sentence, the single most important thing to know today
- "body": 3-5 short bullet-style sentences covering signups, generation volume, error rate, and the fit-verdict distribution — call out anything that looks wrong (error spike, zero signups, mostly weak/stretch fits) plainly
- "needs_human": true if something here genuinely needs the founder's attention today (error spike, nearing a rate limit, zero activity), false if it's a normal day

Return only JSON.`;

type Digest = { headline: string; body: string; needs_human: boolean };

/** Fully autonomous: reads and summarizes usage data, writes only to agent_runs,
    never touches user-facing data. */
export const opsDigest: Agent = async (ctx) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsToday, eventsWeek, appsWeek, usersPage] = await Promise.all([
    ctx.supabase.from("generation_events").select("success, used_fallback").gte("created_at", dayAgo),
    ctx.supabase.from("generation_events").select("success, used_fallback").gte("created_at", weekAgo),
    ctx.supabase.from("applications").select("ats, created_at").gte("created_at", weekAgo),
    ctx.supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const countFalse = (rows: { success: boolean }[] | null) => (rows ?? []).filter((r) => !r.success).length;
  const countFallback = (rows: { used_fallback: boolean }[] | null) =>
    (rows ?? []).filter((r) => r.used_fallback).length;

  const users = usersPage.data?.users ?? [];
  const usersToday = users.filter((u) => u.created_at >= dayAgo).length;
  const usersWeek = users.filter((u) => u.created_at >= weekAgo).length;

  const fitCounts: Record<string, number> = {};
  for (const app of appsWeek.data ?? []) {
    const level = (app.ats as { fit?: { level?: string } } | null)?.fit?.level;
    if (level) fitCounts[level] = (fitCounts[level] ?? 0) + 1;
  }

  const stats = {
    signups: { today: usersToday, last_7_days: usersWeek },
    generations: {
      today: eventsToday.data?.length ?? 0,
      today_errors: countFalse(eventsToday.data),
      today_used_fallback: countFallback(eventsToday.data),
      last_7_days: eventsWeek.data?.length ?? 0,
      last_7_days_errors: countFalse(eventsWeek.data),
    },
    fit_distribution_7d: fitCounts,
  };

  if (!ctx.llm) {
    return { summary: `Ops digest (no LLM configured): ${JSON.stringify(stats)}`, data: stats, needsHuman: false };
  }

  const digest = await chatJsonWithFallback<Digest>(ctx.llm, DIGEST_SYSTEM, digestUser(JSON.stringify(stats, null, 1)));
  return {
    summary: `${digest.headline} ${digest.body}`,
    data: { stats, digest },
    needsHuman: Boolean(digest.needs_human),
  };
};
