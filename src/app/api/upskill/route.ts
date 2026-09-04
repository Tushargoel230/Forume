import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { withinDailyLimit, demoRateKey, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { chat, extractJson, llmConfigFromEnv, fallbackConfig, friendlyLlmError } from "@/lib/llm";
import type { UpskillPlan, Resume } from "@/lib/types";

export const maxDuration = 300;

type Doc = { content?: string };

const SYSTEM =
  "You are an honest career coach. Compare a candidate's REAL background to a job's " +
  "requirements and produce a focused learning plan to close the genuine gaps. Only call " +
  "something a gap if the background truly doesn't show it — never imply they lack a skill " +
  "they clearly have, and never invent skills they have. Be specific to this role. Return " +
  "STRICT JSON only:\n" +
  '{"summary":"…","gaps":[{"skill":"…","priority":"high|medium|low","why":"…","resource":"…"}]}\n' +
  "3–6 gaps, ordered most-important first; 'why' ties the gap to this job; 'resource' is one " +
  "concrete, real way to learn it (a well-known course, doc, book, or project idea). If the " +
  "candidate already fits well, say so in 'summary' and keep gaps short or empty.";

function resumeToText(r: Resume | null): string {
  if (!r) return "";
  const parts = [r.headline, r.summary];
  for (const g of r.skills ?? []) parts.push(`${g.category}: ${g.items.join(", ")}`);
  for (const j of r.experience ?? []) parts.push(`${j.title} @ ${j.company}: ${j.bullets.join(" ")}`);
  return parts.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const isDemo = token.startsWith("demo-");
  const body = await request.json().catch(() => ({}));

  const cfg = llmConfigFromEnv();
  if (!cfg) return NextResponse.json({ error: "The coaching engine isn't configured." }, { status: 503 });

  let jd = "", background = "", resumeText = "";

  if (isDemo) {
    if (!(await withinDailyLimit(`us:${demoRateKey(request)}`, DEMO_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's free limit — sign in for more." }, { status: 429 });
    }
    jd = String(body.jd ?? "");
    background = (Array.isArray(body.documents) ? body.documents : []).map((d: Doc) => d.content ?? "").filter(Boolean).join("\n\n");
    resumeText = resumeToText((body.resume ?? null) as Resume | null);
  } else {
    if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const asUser = supabaseAsUser(token);
    const { data: u, error } = await asUser.auth.getUser(token);
    if (error || !u.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const id = body.applicationId;
    if (!id) return NextResponse.json({ error: "Missing application." }, { status: 422 });

    const { data: app } = await asUser
      .from("applications")
      .select("jd, resume, upskill_plan")
      .eq("id", id)
      .maybeSingle();
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (app.upskill_plan && !body.force) {
      return NextResponse.json({ plan: app.upskill_plan, cached: true });
    }
    if (!(await withinDailyLimit(`us:user:${u.user.id}`, USER_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's limit — try again tomorrow." }, { status: 429 });
    }
    jd = app.jd ?? "";
    resumeText = resumeToText((app.resume ?? null) as Resume | null);
    const { data: docs } = await asUser.from("documents").select("content");
    background = (docs ?? []).map((d) => (d as Doc).content ?? "").filter(Boolean).join("\n\n");
  }

  if (!background.trim() && !resumeText.trim()) {
    return NextResponse.json({ error: "Add your résumé or documents first — the plan is built from your real experience." }, { status: 422 });
  }

  const user =
    `CANDIDATE BACKGROUND (their real, only-allowed facts):\n${(background || resumeText).slice(0, 6000)}\n\n` +
    `TARGET JOB:\n${jd.slice(0, 3500)}`;

  let plan: UpskillPlan;
  try {
    const run = async (c: typeof cfg) => extractJson<UpskillPlan>(await chat(c, SYSTEM, user, true, 0.4));
    try {
      plan = await run(cfg);
    } catch (e) {
      const fb = fallbackConfig(cfg);
      if (!fb) throw e;
      plan = await run(fb);
    }
  } catch (e) {
    return NextResponse.json({ error: friendlyLlmError(e) }, { status: 502 });
  }

  if (!isDemo && body.applicationId) {
    try {
      await supabaseAsUser(token).from("applications").update({ upskill_plan: plan }).eq("id", body.applicationId);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ plan, cached: false });
}
