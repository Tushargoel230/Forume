import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { withinDailyLimit, demoRateKey, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { chat, extractJson, llmConfigFromEnv, fallbackConfig, friendlyLlmError } from "@/lib/llm";
import type { GroundingReview, Resume } from "@/lib/types";

export const maxDuration = 300;

type Doc = { content?: string };

const SYSTEM =
  "You are a strict factual-grounding auditor for a résumé. You are given the candidate's " +
  "SOURCES (their real documents) and a generated RÉSUMÉ. Flag ONLY claims in the résumé that " +
  "are NOT clearly supported by the sources — invented employers, titles, dates, metrics, or " +
  "skills. Do not flag reasonable rewording, formatting, or summarising of supported facts, and " +
  "do not flag a fact just because the wording differs. If everything is supported, return a " +
  "clean verdict. Return STRICT JSON only:\n" +
  '{"verdict":"clean|flags","note":"…","flags":[{"claim":"…","issue":"…"}]}\n' +
  "'note' is one honest sentence; 'flags' lists each unsupported claim with why it isn't grounded.";

function resumeToText(r: Resume | null): string {
  if (!r) return "";
  const parts = [r.headline, r.summary];
  for (const g of r.skills ?? []) parts.push(`${g.category}: ${g.items.join(", ")}`);
  for (const j of r.experience ?? []) parts.push(`${j.title} @ ${j.company} (${j.dates ?? "?"}): ${j.bullets.join(" ")}`);
  for (const p of r.projects ?? []) parts.push(`${p.name}: ${p.bullets.join(" ")}`);
  for (const e of r.education ?? []) parts.push(`${e.degree}, ${e.school}`);
  parts.push(...(r.certifications ?? []));
  return parts.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const isDemo = token.startsWith("demo-");
  const body = await request.json().catch(() => ({}));

  const cfg = llmConfigFromEnv();
  if (!cfg) return NextResponse.json({ error: "The review engine isn't configured." }, { status: 503 });

  let background = "", resumeText = "";

  if (isDemo) {
    if (!(await withinDailyLimit(`rv:${demoRateKey(request)}`, DEMO_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's free limit — sign in for more." }, { status: 429 });
    }
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
      .select("resume, grounding_review")
      .eq("id", id)
      .maybeSingle();
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (app.grounding_review && !body.force) {
      return NextResponse.json({ review: app.grounding_review, cached: true });
    }
    if (!(await withinDailyLimit(`rv:user:${u.user.id}`, USER_DAILY_LIMIT))) {
      return NextResponse.json({ error: "You've hit today's limit — try again tomorrow." }, { status: 429 });
    }
    resumeText = resumeToText((app.resume ?? null) as Resume | null);
    const { data: docs } = await asUser.from("documents").select("content");
    background = (docs ?? []).map((d) => (d as Doc).content ?? "").filter(Boolean).join("\n\n");
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: "No résumé to review yet." }, { status: 422 });
  }
  if (!background.trim()) {
    return NextResponse.json({ error: "Add your source documents so we have something to check against." }, { status: 422 });
  }

  const user =
    `SOURCES (the only supported facts):\n${background.slice(0, 6000)}\n\n` +
    `GENERATED RÉSUMÉ:\n${resumeText.slice(0, 3500)}`;

  let review: GroundingReview;
  try {
    const run = async (c: typeof cfg) => extractJson<GroundingReview>(await chat(c, SYSTEM, user, true, 0.2));
    try {
      review = await run(cfg);
    } catch (e) {
      const fb = fallbackConfig(cfg);
      if (!fb) throw e;
      review = await run(fb);
    }
  } catch (e) {
    return NextResponse.json({ error: friendlyLlmError(e) }, { status: 502 });
  }

  if (!isDemo && body.applicationId) {
    try {
      await supabaseAsUser(token).from("applications").update({ grounding_review: review }).eq("id", body.applicationId);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ review, cached: false });
}
