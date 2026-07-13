import { supabaseAdmin } from "@/lib/supabase";

/** Fire-and-forget instrumentation for /api/generate and /api/fix.
    Never throws and never blocks the response — a logging failure must not
    affect generation. */
export function logGenerationEvent(event: {
  route: "generate" | "fix";
  identifier: string;
  model?: string;
  latencyMs: number;
  success: boolean;
  usedFallback?: boolean;
}): void {
  const admin = supabaseAdmin();
  if (!admin) return;
  admin
    .from("generation_events")
    .insert({
      route: event.route,
      identifier: event.identifier,
      model: event.model ?? null,
      latency_ms: event.latencyMs,
      success: event.success,
      used_fallback: event.usedFallback ?? false,
    })
    .then(({ error }) => {
      if (error) console.warn("generation_events insert failed:", error.message);
    });
}
