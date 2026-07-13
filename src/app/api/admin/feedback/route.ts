import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/agents/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/** Quick-entry: the founder pastes in a WhatsApp/email message so the
    support-triage agent has something to categorize and draft a reply for. */
export async function POST(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const message: string = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 422 });

  const { error } = await admin.from("feedback").insert({ raw_message: message, source: "admin-entry" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  const status = body.status;
  if (!id || !["new", "triaged", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid id/status." }, { status: 422 });
  }
  const { error } = await admin.from("feedback").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
