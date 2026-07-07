import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { atsCheck } from "@/lib/ats";
import { DEMO_COVER, DEMO_KEYWORDS, DEMO_RESUME } from "@/lib/demo";
import * as prompts from "@/lib/prompts";
import type { Contact, Resume } from "@/lib/types";

export const maxDuration = 300;

const CONTEXT_BUDGET = 24000;

type LlmConfig = { baseUrl: string; apiKey: string; model: string };

function llmConfig(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !model) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey: process.env.LLM_API_KEY ?? "", model };
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

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const supabase = supabaseAsUser(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });
  }
  const user = userData.user;

  const body = await request.json();
  const jd: string = (body.jd ?? "").trim();
  const company: string = (body.company ?? "").trim();
  const role: string = (body.role ?? "").trim();
  const template: string = body.template ?? "slate";
  if (!jd) return NextResponse.json({ error: "Paste a job description first." }, { status: 422 });

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

  const cfg = llmConfig();
  let resume: Resume;
  let cover: string;
  let keywords: string[];
  let isDemo = false;

  if (!cfg) {
    resume = DEMO_RESUME;
    cover = DEMO_COVER;
    keywords = DEMO_KEYWORDS;
    isDemo = true;
  } else {
    if (!context) {
      return NextResponse.json(
        { error: "Your profile is empty — add a resume or notes in Profile first." },
        { status: 422 },
      );
    }
    try {
      const analysisRaw = await chat(
        cfg, prompts.ANALYSIS_SYSTEM,
        prompts.analysisUser(context, company || "(not specified)", role || "(see JD)", jd),
        true,
      );
      const analysis = extractJson<{ top_keywords?: string[] }>(analysisRaw);
      const analysisStr = JSON.stringify(analysis, null, 1);

      const resumeRaw = await chat(
        cfg, prompts.RESUME_SYSTEM,
        prompts.resumeUser(context, company || "(not specified)", role || "(see JD)", jd, analysisStr),
        true,
      );
      resume = extractJson<Resume>(resumeRaw);

      cover = (
        await chat(
          cfg, prompts.COVER_SYSTEM,
          prompts.coverUser(context, contact.name, company || "(not specified)", role || "(see JD)", jd, analysisStr),
          false,
        )
      ).trim();
      keywords = (analysis.top_keywords ?? []).filter((k) => typeof k === "string");
    } catch (e) {
      return NextResponse.json(
        { error: `Generation failed: ${e instanceof Error ? e.message : e}` },
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
      is_demo: isDemo,
    })
    .select("id, created_at")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    resume, cover_letter: cover, ats,
    is_demo: isDemo,
    created_at: inserted.created_at,
  });
}
