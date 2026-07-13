import type { Agent } from "./types";

/* Groq's free-tier request ceiling (see PROJECT.md §7). generation_events
   doesn't capture token counts, so this watches request volume — a fair
   proxy: sustained high 429/error rates are the real signal of hitting caps. */
const GROQ_FREE_REQUESTS_PER_DAY = 14_400;
const WARN_AT_FRACTION = 0.6;

/** No LLM call needed — pure arithmetic over generation_events. Monthly cadence
    is plenty; this only needs to catch a trend before it becomes a surprise. */
export const costWatchdog: Agent = async (ctx) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await ctx.supabase
    .from("generation_events")
    .select("success, used_fallback, created_at")
    .gte("created_at", thirtyDaysAgo);

  const rows = events ?? [];
  const days = 30;
  const avgPerDay = rows.length / days;
  const errorCount = rows.filter((r) => !r.success).length;
  const fallbackCount = rows.filter((r) => r.used_fallback).length;
  const errorRate = rows.length > 0 ? errorCount / rows.length : 0;
  const fallbackRate = rows.length > 0 ? fallbackCount / rows.length : 0;
  const fractionOfCeiling = avgPerDay / GROQ_FREE_REQUESTS_PER_DAY;

  const stats = {
    total_calls_30d: rows.length,
    avg_calls_per_day: Math.round(avgPerDay * 10) / 10,
    groq_free_tier_ceiling_per_day: GROQ_FREE_REQUESTS_PER_DAY,
    fraction_of_ceiling: Math.round(fractionOfCeiling * 1000) / 1000,
    error_rate_30d: Math.round(errorRate * 1000) / 1000,
    fallback_rate_30d: Math.round(fallbackRate * 1000) / 1000,
  };

  const needsHuman = fractionOfCeiling >= WARN_AT_FRACTION || errorRate >= 0.1;
  const summary = needsHuman
    ? `Averaging ${stats.avg_calls_per_day}/day (${Math.round(fractionOfCeiling * 100)}% of Groq's free-tier ceiling) with a ${Math.round(errorRate * 100)}% error rate — worth checking before it becomes a hard cutoff.`
    : `Averaging ${stats.avg_calls_per_day} calls/day, well under Groq's free-tier ceiling. Nothing to act on.`;

  return { summary, data: stats, needsHuman };
};
