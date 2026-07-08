import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { atsCheck } from "@/lib/ats";
import {
  CONTEXT_BUDGET, chat, extractJson, fallbackConfig, friendlyLlmError, llmConfigFromEnv,
} from "@/lib/llm";
import { clientIpHash, withinDailyLimit, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import * as prompts from "@/lib/prompts";
import type { AtsReport, Contact, Resume } from "@/lib/types";

export const maxDuration = 300;

const RESUME_KEYS = [
  "headline", "summary", "skills", "experience", "projects", "education", "certifications",
] as const;

/** One targeted LLM pass that weaves the ATS report's missing keywords into the
    resume where the candidate's background genuinely supports them. */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const demoMode = Boolean(request.headers.get("x-demo-email")) || token.startsWith("demo-");
  if (!demoMode && !token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const cfg = llmConfigFromEnv();
  if (!cfg) {
    return NextResponse.json({ error: "The writing engine is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const jd: string = (body.jd ?? "").trim();
  const resume = body.resume as Resume | undefined;
  const ats = body.ats as AtsReport | undefined;
  const contact: Contact = {
    name: body.contact?.name ?? "", email: body.contact?.email ?? "",
    phone: body.contact?.phone ?? "", location: body.contact?.location ?? "",
    linkedin: body.contact?.linkedin ?? "", website: body.contact?.website ?? "",
  };
  if (!jd || !resume || !ats) {
    return NextResponse.json({ error: "Nothing to fix — generate a resume first." }, { status: 422 });
  }

  const problems: string[] = [
    ...ats.keywords_missing.map((k) => `MISSING KEYWORD: ${k}`),
    ...ats.checks.filter((c) => !c.passed).map((c) => `${c.name.toUpperCase()}: ${c.detail}`),
  ];
  if (problems.length === 0) {
    return NextResponse.json({ resume, ats, changed: false });
  }

  /* context: demo sends documents in the body; signed-in reads Supabase */
  let context = "";
  if (demoMode) {
    const docs: { name: string; content: string }[] = Array.isArray(body.documents)
      ? body.documents.filter(
          (d: unknown): d is { name: string; content: string } =>
            !!d && typeof (d as { content?: unknown }).content === "string",
        )
      : [];
    context = docs.map((d) => `### ${d.name}\n${d.content}`).join("\n\n").slice(0, CONTEXT_BUDGET);
    if (!(await withinDailyLimit(`ip:${clientIpHash(request)}`, DEMO_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "Daily demo limit reached — sign in for a higher limit, or come back tomorrow." },
        { status: 429 },
      );
    }
  } else {
    const supabase = supabaseAsUser(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });
    }
    const { data: docs } = await supabase.from("documents").select("name, content").order("id");
    context = (docs ?? []).map((d) => `### ${d.name}\n${d.content}`).join("\n\n").slice(0, CONTEXT_BUDGET);
    if (!(await withinDailyLimit(`user:${userData.user.id}`, USER_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've reached today's generation limit — it resets tomorrow." },
        { status: 429 },
      );
    }
  }
  if (!context) {
    return NextResponse.json(
      { error: "No source documents found — the fix pass only adds what's true of you." },
      { status: 422 },
    );
  }

  const user = prompts.fixUser(context, jd, JSON.stringify(resume, null, 1), problems.join("\n"));
  let fixed: Resume;
  try {
    fixed = extractJson<Resume>(await chat(cfg, prompts.FIX_SYSTEM, user, true, 0.3));
  } catch (e) {
    const fb = fallbackConfig(cfg);
    if (!fb) return NextResponse.json({ error: friendlyLlmError(e) }, { status: 502 });
    try {
      fixed = extractJson<Resume>(await chat(fb, prompts.FIX_SYSTEM, user, true, 0.3));
    } catch (e2) {
      return NextResponse.json({ error: friendlyLlmError(e2) }, { status: 502 });
    }
  }

  // guard against the model dropping whole sections
  const fixedRec = fixed as unknown as Record<string, unknown>;
  const origRec = resume as unknown as Record<string, unknown>;
  for (const key of RESUME_KEYS) {
    const v = fixedRec[key];
    const empty = v == null || (Array.isArray(v) && v.length === 0) || v === "";
    if (empty && origRec[key]) fixedRec[key] = origRec[key];
  }

  const keywords = [...ats.keywords_found, ...ats.keywords_missing];
  const newAts = atsCheck(fixed, contact, keywords);
  if (ats.fit) newAts.fit = ats.fit; // fit judges the person, not the resume draft
  return NextResponse.json({ resume: fixed, ats: newAts, changed: true });
}
