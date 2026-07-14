import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import {
  CONTEXT_BUDGET, chat, fallbackConfig, friendlyLlmError, llmConfigFromEnv,
} from "@/lib/llm";
import { demoRateKey, withinDailyLimit, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { logGenerationEvent } from "@/lib/telemetry";
import * as prompts from "@/lib/prompts";

export const maxDuration = 300;

const TONES = ["professional", "warm", "confident", "enthusiastic", "formal"];
const LENGTHS: Record<string, string> = {
  short: "Keep it brief: 3 short paragraphs, 180-230 words.",
  standard: "Standard length: 250-350 words.",
  detailed: "Fuller: 4 paragraphs, 350-420 words.",
};

/** Regenerate just the cover letter with an optional tone/length steer. */
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
  const company: string = (body.company ?? "").trim();
  const role: string = (body.role ?? "").trim();
  const name: string = body.contact?.name ?? "";
  const tone: string = TONES.includes(body.tone) ? body.tone : "professional";
  const length: string = LENGTHS[body.length] ? body.length : "standard";
  if (!jd) {
    return NextResponse.json({ error: "Generate a resume first." }, { status: 422 });
  }

  /* context: demo sends documents in the body; signed-in reads Supabase */
  let context = "";
  let identifier: string;
  if (demoMode) {
    identifier = demoRateKey(request);
    const docs: { name: string; content: string }[] = Array.isArray(body.documents)
      ? body.documents.filter(
          (d: unknown): d is { name: string; content: string } =>
            !!d && typeof (d as { content?: unknown }).content === "string",
        )
      : [];
    context = docs.map((d) => `### ${d.name}\n${d.content}`).join("\n\n").slice(0, CONTEXT_BUDGET);
    if (!(await withinDailyLimit(demoRateKey(request), DEMO_DAILY_LIMIT))) {
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
    identifier = `user:${userData.user.id}`;
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
      { error: "No source documents found — the letter is written from your real experience." },
      { status: 422 },
    );
  }

  const steer = `Tone: ${tone}. ${LENGTHS[length]}`;
  const startedAt = Date.now();
  let coverText: string;
  let modelUsed = cfg.model;
  let usedFallback = false;
  try {
    coverText = (
      await chat(cfg, prompts.COVER_SYSTEM,
        prompts.coverUser(context, name, company || "(not specified)", role || "(see JD)", jd, steer), false)
    ).trim();
  } catch (e) {
    const fb = fallbackConfig(cfg);
    if (!fb) {
      logGenerationEvent({ route: "fix", identifier, latencyMs: Date.now() - startedAt, success: false });
      return NextResponse.json({ error: friendlyLlmError(e) }, { status: 502 });
    }
    try {
      coverText = (
        await chat(fb, prompts.COVER_SYSTEM,
          prompts.coverUser(context, name, company || "(not specified)", role || "(see JD)", jd, steer), false)
      ).trim();
      modelUsed = fb.model;
      usedFallback = true;
    } catch (e2) {
      logGenerationEvent({ route: "fix", identifier, latencyMs: Date.now() - startedAt, success: false });
      return NextResponse.json({ error: friendlyLlmError(e2) }, { status: 502 });
    }
  }
  logGenerationEvent({
    route: "fix", identifier, model: modelUsed,
    latencyMs: Date.now() - startedAt, success: true, usedFallback,
  });

  return NextResponse.json({ cover_letter: coverText });
}
