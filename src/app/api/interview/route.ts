import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { withinDailyLimit, demoRateKey, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { chat, extractJson, llmConfigFromEnv, fallbackConfig, friendlyLlmError } from "@/lib/llm";
import type { InterviewPrep, Resume } from "@/lib/types";

export const maxDuration = 300;

type Doc = { content?: string };

const SYSTEM =
  "You are a sharp, honest interview coach. Prepare a candidate for a specific, real " +
  "interview using ONLY facts present in their background — never invent experience, and " +
  "keep every talking point consistent with the résumé they submitted. Be concrete and " +
  "specific to this role, not generic. Return STRICT JSON only, matching this shape:\n" +
  '{"likely_questions":[{"q":"…","why":"…"}],"star_answers":[{"prompt":"…","answer":"…"}],' +
  '"questions_to_ask":["…"],"company_angle":"…"}\n' +
  "5–7 likely questions (mix technical and behavioural) each with a one-line 'why they ask'; " +
  "2–3 STAR-style answers built strictly from the candidate's real experience; 3–4 smart " +
  "questions for the candidate to ask; and a short 'company_angle' paragraph on how to frame " +
  "their fit. If the background is thin, say so honestly in company_angle rather than inventing.";

function resumeToText(r: Resume | null): string {
  if (!r) return "";
  const parts = [r.headline, r.summary];
  for (const g of r.skills ?? []) parts.push(`${g.category}: ${g.items.join(", ")}`);
  for (const j of r.experience ?? []) parts.push(`${j.title} @ ${j.company}: ${j.bullets.join(" ")}`);
  for (const p of r.projects ?? []) parts.push(`${p.name}: ${p.bullets.join(" ")}`);
  return parts.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const isDemo = token.startsWith("demo-");
  const body = await request.json().catch(() => ({}));
  const stage: string = typeof body.stage === "string" && body.stage.trim() ? body.stage.trim() : "an interview";

  const cfg = llmConfigFromEnv();
  if (!cfg) return NextResponse.json({ error: "The interview engine isn't configured." }, { status: 503 });

  let jd = "", company = "", role = "", background = "", resumeText = "";

  if (isDemo) {
    if (!(await withinDailyLimit(`iv:${demoRateKey(request)}`, DEMO_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's free limit — sign in for more." }, { status: 429 });
    }
    jd = String(body.jd ?? "");
    company = String(body.company ?? "");
    role = String(body.role ?? "");
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
      .select("jd, company, role, resume, interview_prep")
      .eq("id", id)
      .maybeSingle();
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    // cached → free
    if (app.interview_prep && !body.force) {
      return NextResponse.json({ prep: app.interview_prep, cached: true });
    }
    if (!(await withinDailyLimit(`iv:user:${u.user.id}`, USER_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's limit — try again tomorrow." }, { status: 429 });
    }
    jd = app.jd ?? "";
    company = app.company ?? "";
    role = app.role ?? "";
    resumeText = resumeToText((app.resume ?? null) as Resume | null);
    const { data: docs } = await asUser.from("documents").select("content");
    background = (docs ?? []).map((d) => (d as Doc).content ?? "").filter(Boolean).join("\n\n");
  }

  if (!background.trim() && !resumeText.trim()) {
    return NextResponse.json({ error: "Add your résumé or documents first — interview prep is built from your real experience." }, { status: 422 });
  }

  const user =
    `BACKGROUND (the candidate's real, only-allowed facts):\n${background.slice(0, 6000)}\n\n` +
    (resumeText ? `SUBMITTED RÉSUMÉ (keep talking points consistent with this):\n${resumeText.slice(0, 2500)}\n\n` : "") +
    `INTERVIEW: ${stage} for ${role || "the role"}${company ? ` at ${company}` : ""}\n` +
    `JOB DESCRIPTION:\n${jd.slice(0, 3500)}`;

  let prep: InterviewPrep;
  try {
    const run = async (c: typeof cfg) => extractJson<InterviewPrep>(await chat(c, SYSTEM, user, true, 0.5));
    try {
      prep = await run(cfg);
    } catch (e) {
      const fb = fallbackConfig(cfg);
      if (!fb) throw e;
      prep = await run(fb);
    }
  } catch (e) {
    return NextResponse.json({ error: friendlyLlmError(e) }, { status: 502 });
  }

  // persist for signed-in so we never re-spend the call
  if (!isDemo && body.applicationId) {
    try {
      await supabaseAsUser(token).from("applications").update({ interview_prep: prep }).eq("id", body.applicationId);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ prep, cached: false });
}
