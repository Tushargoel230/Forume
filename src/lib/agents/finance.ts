import type { Agent } from "./types";

/* Finance/runway analyst. Forume is free today, so "finance" = cost headroom
   and growth trajectory: how close generation volume is to the free-tier
   ceiling, and how fast usage is climbing. Pure arithmetic (no LLM) so the
   numbers are trustworthy; revenue slots in here once monetization lands. */
const GROQ_FREE_REQUESTS_PER_DAY = 14_400;

export const finance: Agent = async (ctx) => {
  const now = Date.now();
  const d = (days: number) => new Date(now - days * 864e5).toISOString();

  const { data: events } = await ctx.supabase
    .from("generation_events")
    .select("created_at, success")
    .gte("created_at", d(30));
  const rows = events ?? [];

  const inWindow = (fromDays: number, toDays: number) =>
    rows.filter((r) => r.created_at >= d(fromDays) && r.created_at < d(toDays)).length;

  const last7 = rows.filter((r) => r.created_at >= d(7)).length;
  const prev7 = inWindow(14, 7);
  const perDay7 = last7 / 7;
  const growth = prev7 > 0 ? (last7 - prev7) / prev7 : last7 > 0 ? 1 : 0;

  // How many days until the 7-day trend would cross the free ceiling, if growth holds?
  let daysToCeiling: number | null = null;
  if (perDay7 > 0 && growth > 0) {
    const weeklyMultiplier = 1 + growth;
    let projected = perDay7;
    let weeks = 0;
    while (projected < GROQ_FREE_REQUESTS_PER_DAY && weeks < 104) {
      projected *= weeklyMultiplier;
      weeks++;
    }
    daysToCeiling = weeks < 104 ? weeks * 7 : null;
  }

  const stats = {
    generations_last_7d: last7,
    generations_prev_7d: prev7,
    avg_per_day_7d: Math.round(perDay7 * 10) / 10,
    week_over_week_growth: Math.round(growth * 100) / 100,
    pct_of_free_ceiling: Math.round((perDay7 / GROQ_FREE_REQUESTS_PER_DAY) * 1000) / 1000,
    est_days_to_free_ceiling: daysToCeiling,
    monthly_recurring_revenue_eur: 0, // free product — placeholder for when billing lands
  };

  const nearCeiling = perDay7 / GROQ_FREE_REQUESTS_PER_DAY >= 0.5;
  const rampFast = daysToCeiling !== null && daysToCeiling <= 60;
  const needsHuman = nearCeiling || rampFast;

  const summary = needsHuman
    ? `Usage is ${stats.avg_per_day_7d}/day (${Math.round(stats.pct_of_free_ceiling * 100)}% of the free ceiling), growing ${Math.round(growth * 100)}% w/w` +
      (daysToCeiling !== null ? ` — on this trend the free tier is exhausted in ~${daysToCeiling} days. Line up a paid LLM tier or a second free provider.` : ".")
    : `Usage ${stats.avg_per_day_7d}/day, ${Math.round(stats.pct_of_free_ceiling * 100)}% of the free ceiling, growth ${Math.round(growth * 100)}% w/w. Comfortable runway; still free to run.`;

  return { summary, data: stats, needsHuman };
};
