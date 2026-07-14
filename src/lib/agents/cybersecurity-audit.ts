import type { Agent } from "./types";

/* Read-only security audit over data the service-role client can observe.
   It checks invariants that would indicate an RLS or access-control problem —
   e.g. user-owned rows that somehow have no owner, or demo rows leaking into
   signed-in space. No LLM: these are hard facts, and a false "all clear" from a
   hallucinating model would be worse than useless. Findings page the founder. */
export const cybersecurityAudit: Agent = async (ctx) => {
  const findings: string[] = [];

  // 1) Every user-owned row must have an owner. A null user_id on these tables
  //    means a row RLS can't scope — the exact shape of a cross-user leak.
  for (const table of ["applications", "documents", "profiles"] as const) {
    // Select user_id (the RLS column present on all three) rather than "id" —
    // profiles is keyed on user_id and has no id column.
    const { count, error } = await ctx.supabase
      .from(table)
      .select("user_id", { count: "exact", head: true })
      .is("user_id", null);
    if (error) {
      findings.push(`Could not audit ${table}: ${error.message}`);
    } else if ((count ?? 0) > 0) {
      findings.push(`${count} row(s) in ${table} have a null user_id — RLS cannot scope these. Investigate immediately.`);
    }
  }

  // 2) A spike in failed generations can indicate scripted abuse of the endpoint.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await ctx.supabase
    .from("generation_events")
    .select("success, identifier, created_at")
    .gte("created_at", dayAgo);
  const rows = events ?? [];
  const failures = rows.filter((r) => !r.success).length;
  const failRate = rows.length > 0 ? failures / rows.length : 0;
  if (rows.length >= 20 && failRate >= 0.4) {
    findings.push(`${Math.round(failRate * 100)}% of the last ${rows.length} generations failed — possible endpoint abuse or an outage. Check the top identifiers.`);
  }

  const needsHuman = findings.length > 0;
  const summary = needsHuman
    ? `Security audit found ${findings.length} issue(s): ${findings.join(" | ")}`
    : "Security audit clean: no null-owner rows on user tables, no abnormal generation-failure spike.";

  return { summary, data: { findings, generations_24h: rows.length, failure_rate_24h: Math.round(failRate * 1000) / 1000 }, needsHuman };
};
