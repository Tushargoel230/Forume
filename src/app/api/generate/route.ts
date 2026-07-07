import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { atsCheck } from "@/lib/ats";
import { DEMO_COVER, DEMO_KEYWORDS, DEMO_RESUME } from "@/lib/demo";
import { LLM_PROVIDERS, type ProviderType } from "@/lib/llm-providers";
import * as prompts from "@/lib/prompts";
import type { Contact, Resume } from "@/lib/types";

export const maxDuration = 300;

const CONTEXT_BUDGET = 24000;

type LlmConfig = { baseUrl: string; apiKey: string; model: string };

function llmConfigFromEnv(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !model) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey: process.env.LLM_API_KEY ?? "", model };
}

/** Client-sent config: {provider, apiKey, model, baseUrl?}. The base URL is
    resolved through the provider allowlist so this server only ever calls
    known LLM hosts (custom URLs allowed for local Ollama only). */
function llmConfigFromHeader(header: string): LlmConfig | null {
  try {
    const cfg = JSON.parse(header) as {
      provider?: ProviderType; apiKey?: string; model?: string; baseUrl?: string;
    };
    if (!cfg.provider || !cfg.model) return null;
    const provider = LLM_PROVIDERS[cfg.provider];
    if (!provider) return null;
    let baseUrl = provider.baseUrl;
    if (cfg.provider === "ollama" && cfg.baseUrl) {
      const url = new URL(cfg.baseUrl);
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) return null;
      baseUrl = cfg.baseUrl;
    }
    return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey: cfg.apiKey ?? "", model: cfg.model };
  } catch {
    return null;
  }
}

async function chat(cfg: LlmConfig, system: string, user: string, jsonMode: boolean): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: jsonMode ? 0.4 : 0.7,
    }),
  });
  if (!res.ok) throw new Error(`LLM returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

function extractJson<T>(text: string): T {
  let t = text.trim();
  if (t.startsWith("```")) t = t.split("```")[1].replace(/^json/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(t.slice(start, end + 1)) as T;
}

function fallbackConfig(primary: LlmConfig): LlmConfig | null {
  const model = process.env.LLM_FALLBACK_MODEL;
  if (!model || model === primary.model) return null;
  return {
    baseUrl: (process.env.LLM_FALLBACK_BASE_URL ?? primary.baseUrl).replace(/\/$/, ""),
    apiKey: process.env.LLM_FALLBACK_API_KEY ?? primary.apiKey,
    model,
  };
}

async function runWithFallback(
  cfg: LlmConfig, context: string, contact: Contact,
  company: string, role: string, jd: string,
): Promise<{ resume: Resume; cover: string; keywords: string[] }> {
  try {
    return await runPipeline(cfg, context, contact, company, role, jd);
  } catch (e) {
    const fb = fallbackConfig(cfg);
    if (!fb) throw e;
    return await runPipeline(fb, context, contact, company, role, jd);
  }
}

function friendlyLlmError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes(" 429")) {
    return "The writing engine is at capacity right now — try again in a minute.";
  }
  if (msg.includes(" 401") || msg.includes(" 403")) {
    return "The engine rejected the API key — check it under AI Settings.";
  }
  return `Generation failed: ${msg}`;
}

async function runPipeline(
  cfg: LlmConfig, context: string, contact: Contact,
  company: string, role: string, jd: string,
): Promise<{ resume: Resume; cover: string; keywords: string[] }> {
  const co = company || "(not specified)";
  const ro = role || "(see JD)";

  const analysisRaw = await chat(cfg, prompts.ANALYSIS_SYSTEM,
    prompts.analysisUser(context, co, ro, jd), true);
  const analysis = extractJson<{ top_keywords?: string[] }>(analysisRaw);
  const analysisStr = JSON.stringify(analysis, null, 1);

  const resumeRaw = await chat(cfg, prompts.RESUME_SYSTEM,
    prompts.resumeUser(context, co, ro, jd, analysisStr), true);
  const resume = extractJson<Resume>(resumeRaw);

  const cover = (
    await chat(cfg, prompts.COVER_SYSTEM,
      prompts.coverUser(context, contact.name, co, ro, jd, analysisStr), false)
  ).trim();

  const keywords = (analysis.top_keywords ?? []).filter((k) => typeof k === "string");
  return { resume, cover, keywords };
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

  const cfg = llmConfigFromHeader(request.headers.get("x-llm-config") || "") || llmConfigFromEnv();

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
    let isSample = true;

    if (cfg && context) {
      try {
        ({ resume, cover, keywords } = await runWithFallback(cfg, context, contact, company, role, jd));
        isSample = false;
      } catch (e) {
        return NextResponse.json(
          { error: friendlyLlmError(e) },
          { status: 502 },
        );
      }
    }

    const ats = atsCheck(resume, contact, keywords);
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
    try {
      ({ resume, cover, keywords } = await runWithFallback(cfg, context, contact, company, role, jd));
    } catch (e) {
      return NextResponse.json(
        { error: friendlyLlmError(e) },
        { status: 502 },
      );
    }
  }

  const ats = atsCheck(resume, contact, keywords);
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
