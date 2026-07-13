import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/agents/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const [{ data: agentRuns }, { data: feedback }, { data: contentQueue }] = await Promise.all([
    admin.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(30),
    admin.from("feedback").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("content_queue").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  return NextResponse.json({
    agentRuns: agentRuns ?? [],
    feedback: feedback ?? [],
    contentQueue: contentQueue ?? [],
  });
}
