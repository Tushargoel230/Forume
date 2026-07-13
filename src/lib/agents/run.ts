import type { SupabaseClient } from "@supabase/supabase-js";
import { llmConfigFromEnv } from "@/lib/llm";
import { notifyTelegram } from "./notify";
import { AGENT_REGISTRY } from "./registry";
import type { AgentResult } from "./types";

/** Runs one named agent, recording start/finish/error to agent_runs.
    Shared by the cron dispatcher and the admin manual-trigger route so
    both go through the exact same audit-logged path. */
export async function runAgent(name: string, admin: SupabaseClient, input?: unknown): Promise<AgentResult> {
  const agent = AGENT_REGISTRY[name];
  if (!agent) throw new Error(`Unknown agent: ${name}`);

  const { data: run } = await admin
    .from("agent_runs")
    .insert({ agent: name, status: "running" })
    .select("id")
    .single();

  try {
    const result = await agent({ supabase: admin, llm: llmConfigFromEnv(), notify: notifyTelegram, input });
    await admin
      .from("agent_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        summary: result.summary,
        data: result.data ?? null,
      })
      .eq("id", run?.id);
    if (result.needsHuman) await notifyTelegram(`[${name}] ${result.summary}`);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("agent_runs")
      .update({ finished_at: new Date().toISOString(), status: "error", error: message })
      .eq("id", run?.id);
    await notifyTelegram(`[${name}] failed: ${message}`);
    throw e;
  }
}
