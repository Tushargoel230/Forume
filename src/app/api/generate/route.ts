import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { atsCheck } from "@/lib/ats";
import { DEMO_COVER, DEMO_KEYWORDS, DEMO_RESUME } from "@/lib/demo";
import {
  CONTEXT_BUDGET, chat, coerceResume, extractJson, fallbackConfig, friendlyLlmError, llmConfigFromEnv,
  type LlmConfig,
} from "@/lib/llm";
import { demoRateKey, withinDailyLimit, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { logGenerationEvent } from "@/lib/telemetry";
import * as prompts from "@/lib/prompts";
import type { Contact, Fit, FitLevel, Resume } from "@/lib/types";

export const maxDuration = 300;

async function runWithFallback(
  cfg: LlmConfig, context: string, contact: Contact,
  company: string, role: string, jd: string,
): Promise<{ resume: Resume; cover: string; keywords: string[]; fit?: Fit; modelUsed: string; usedFallback: boolean }> {
  try {
    const result = await runPipeline(cfg, context, contact, company, role, jd);
    return { ...result, modelUsed: cfg.model, usedFallback: false };
  } catch (e) {
    const fb = fallbackConfig(cfg);
    if (!fb) throw e;
    const result = await runPipeline(fb, context, contact, company, role, jd);
    return { ...result, modelUsed: fb.model, usedFallback: true };
  }
}

const FIT_LEVELS: FitLevel[] = ["strong", "good", "fair", "stretch", "weak"];

async function runPipeline(
  cfg: LlmConfig, context: string, contact: Contact,
  company: string, role: string, jd: string,
): Promise<{ resume: Resume; cover: string; keywords: string[]; fit?: Fit }> {
  const co = company || "(not specified)";
  const ro = role || "(see JD)";

  const analysisRaw = await chat(cfg, prompts.ANALYSIS_SYSTEM,
    prompts.analysisUser(context, co, ro, jd), true);
  const analysis = extractJson<{ top_keywords?: string[]; fit?: string; fit_reasons?: string[] }>(analysisRaw);
  const analysisStr = JSON.stringify(analysis, null, 1);

  const resumeRaw = await chat(cfg, prompts.RESUME_SYSTEM,
    prompts.resumeUser(context, co, ro, jd, analysisStr), true);
  const resume = coerceResume(extractJson(resumeRaw));

  const cover = (
    await chat(cfg, prompts.COVER_SYSTEM,
      prompts.coverUser(context, contact.name, co, ro, jd, analysisStr), false)
  ).trim();

  const keywords = (analysis.top_keywords ?? []).filter((k) => typeof k === "string");
  const fit: Fit | undefined = FIT_LEVELS.includes(analysis.fit as FitLevel)
    ? {
        level: analysis.fit as FitLevel,
        reasons: (analysis.fit_reasons ?? []).filter((r) => typeof r === "string").slice(0, 4),
      }
    : undefined;
  return { resume, cover, keywords, fit };
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const demoEmail = request.headers.get("x-demo-email")?.trim() ?? "";
  const demoMode = Boolean(demoEmail) || token.startsWith("demo-");

  if (!demoMode && !token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json();
  const jd: string = (body.jd ?? "").trim();
  const company: string = (body.company ?? "").trim();
  const role: string = (body.role ?? "").trim();
  const template: string = body.template ?? "slate";
  if (!jd) return NextResponse.json({ error: "Paste a job description first." }, { status: 422 });

  const cfg = llmConfigFromEnv();

  /* ---------- demo mode: no database; documents come from the client ---------- */
  if (demoMode) {
    const contact: Contact = {
      name: body.contact?.name ?? "",
      email: demoEmail || "demo@forume.app",
      phone: body.contact?.phone ?? "",
      location: body.contact?.location ?? "",
      linkedin: body.contact?.linkedin ?? "",
      website: body.contact?.website ?? "",
    };
    const docs: { name: string; content: string }[] = Array.isArray(body.documents)
      ? body.documents.filter(
          (d: unknown): d is { name: string; content: string } =>
            !!d && typeof (d as { content?: unknown }).content === "string",
        )
      : [];
    const context = docs
      .map((d) => `### ${d.name}\n${d.content}`)
      .join("\n\n")
      .slice(0, CONTEXT_BUDGET);

    let resume: Resume = DEMO_RESUME;
    let cover = DEMO_COVER;
    let keywords = DEMO_KEYWORDS;
    let fit: Fit | undefined;
    let isSample = true;

    if (cfg && context) {
      if (!(await withinDailyLimit(demoRateKey(request), DEMO_DAILY_LIMIT))) {
        return NextResponse.json(
          { error: "Daily demo limit reached — sign in for a higher limit, or come back tomorrow." },
          { status: 429 },
        );
      }
      const startedAt = Date.now();
      try {
        const result = await runWithFallback(cfg, context, contact, company, role, jd);
        ({ resume, cover, keywords, fit } = result);
        isSample = false;
        logGenerationEvent({
          route: "generate", identifier: demoRateKey(request), model: result.modelUsed,
          latencyMs: Date.now() - startedAt, success: true, usedFallback: result.usedFallback,
        });
      } catch (e) {
        logGenerationEvent({
          route: "generate", identifier: demoRateKey(request),
          latencyMs: Date.now() - startedAt, success: false,
        });
        return NextResponse.json(
          { error: friendlyLlmError(e) },
          { status: 502 },
        );
      }
    }

    const ats = atsCheck(resume, contact, keywords);
    if (fit) ats.fit = fit;
    return NextResponse.json({
      id: `demo-${Date.now()}`,
      resume, cover_letter: cover, ats,
      is_demo: isSample,
      engine_used: isSample ? null : cfg!.model,
      created_at: new Date().toISOString(),
    });
  }

  /* ---------- signed-in mode: documents come from Supabase ---------- */
  const supabase = supabaseAsUser(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });
  }
  const user = userData.user;

  const [{ data: docs }, { data: profile }] = await Promise.all([
    supabase.from("documents").select("name, content").order("id"),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const contact: Contact = {
    name: profile?.name ?? "",
    email: user.email ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    linkedin: profile?.linkedin ?? "",
    website: profile?.website ?? "",
  };
  const context = (docs ?? [])
    .map((d) => `### ${d.name}\n${d.content}`)
    .join("\n\n")
    .slice(0, CONTEXT_BUDGET);

  let resume: Resume;
  let cover: string;
  let keywords: string[];
  let fit: Fit | undefined;
  let isSample = false;

  if (!cfg) {
    resume = DEMO_RESUME;
    cover = DEMO_COVER;
    keywords = DEMO_KEYWORDS;
    isSample = true;
  } else {
    if (!context) {
      return NextResponse.json(
        { error: "Your profile is empty — add a resume or notes in Profile first." },
        { status: 422 },
      );
    }
    if (!(await withinDailyLimit(`user:${user.id}`, USER_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've reached today's generation limit — it resets tomorrow." },
        { status: 429 },
      );
    }
    const startedAt = Date.now();
    try {
      const result = await runWithFallback(cfg, context, contact, company, role, jd);
      ({ resume, cover, keywords, fit } = result);
      logGenerationEvent({
        route: "generate", identifier: `user:${user.id}`, model: result.modelUsed,
        latencyMs: Date.now() - startedAt, success: true, usedFallback: result.usedFallback,
      });
    } catch (e) {
      logGenerationEvent({
        route: "generate", identifier: `user:${user.id}`,
        latencyMs: Date.now() - startedAt, success: false,
      });
      return NextResponse.json(
        { error: friendlyLlmError(e) },
        { status: 502 },
      );
    }
  }

  const ats = atsCheck(resume, contact, keywords);
  if (fit) ats.fit = fit;
  const { data: inserted, error: insertErr } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company, role, jd, template,
      resume, cover_letter: cover, ats,
      is_demo: isSample,
    })
    .select("id, created_at")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    resume, cover_letter: cover, ats,
    is_demo: isSample,
    engine_used: isSample ? null : cfg!.model,
    created_at: inserted.created_at,
  });
}
