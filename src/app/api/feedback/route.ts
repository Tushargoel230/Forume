import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/* Public feedback intake (in-app "Send feedback" and the "Did this get you an
   interview?" prompt). Writes to the deny-all `feedback` table via the service
   role; the support-triage agent later categorizes and drafts a reply. */
export async function POST(request: Request) {
  let body: { message?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const message = (body.message ?? "").toString().trim().slice(0, 2000);
  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 422 });
  }
  const kind = body.kind === "interview-outcome" ? "interview-outcome" : "in-app";

  const admin = supabaseAdmin();
  if (!admin) {
    // No service role configured (e.g. local demo) — accept silently so the UI
    // still feels responsive; nothing to persist.
    return NextResponse.json({ ok: true, stored: false });
  }

  const { error } = await admin.from("feedback").insert({
    source: kind,
    raw_message: message,
    status: "new",
    ...(kind === "interview-outcome" ? { category: "interview-outcome" } : {}),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
