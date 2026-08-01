import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/agents/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const STATUSES = ["draft", "approved", "rejected", "posted"];

export async function PATCH(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  // Bulk: move every item currently in `from` → `status` (e.g. approve/reject all drafts).
  if (body.bulk) {
    const from = body.from;
    if (!STATUSES.includes(from)) {
      return NextResponse.json({ error: "Invalid 'from' status." }, { status: 422 });
    }
    const { data, error } = await admin
      .from("content_queue")
      .update({ status })
      .eq("status", from)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
  }

  // Single item by id.
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 422 });
  }
  const { error } = await admin.from("content_queue").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
