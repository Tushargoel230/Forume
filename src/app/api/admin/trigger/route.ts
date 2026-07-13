import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/agents/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { runAgent } from "@/lib/agents/run";

export const maxDuration = 300;

/** Manual "run now" button for /admin — same audited path as the cron dispatcher,
    just authorized by the founder's own session instead of the cron secret. */
export async function POST(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.agent === "string" ? body.agent : "";

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  try {
    const result = await runAgent(name, admin, body.input);
    return NextResponse.json({ ok: true, summary: result.summary, needsHuman: result.needsHuman });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
