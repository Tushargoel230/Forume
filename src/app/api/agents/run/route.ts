import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runAgent } from "@/lib/agents/run";

export const maxDuration = 300;

/** Single dispatcher for every scheduled agent — one route, not one per agent.
    Guarded by a shared secret; only the GitHub Actions cron knows it. */
export async function POST(request: Request) {
  const expected = process.env.AGENT_CRON_SECRET;
  const secret = request.headers.get("x-agent-secret") ?? "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
