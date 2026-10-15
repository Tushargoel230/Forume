import { NextResponse } from "next/server";
import { supabaseAsUser } from "@/lib/supabase";
import { atsCheck } from "@/lib/ats";
import {
  chat, coerceResume, extractJson, fallbackConfig, friendlyLlmError, llmConfigFromEnv,
  type LlmConfig,
} from "@/lib/llm";
import { demoRateKey, withinDailyLimit, DEMO_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/rate-limit";
import { logGenerationEvent } from "@/lib/telemetry";
import { LANGUAGES } from "@/lib/languages";
import { checkCoverTranslation, checkTranslation } from "@/lib/translate-guard";
import * as prompts from "@/lib/prompts";
import type { AtsReport, Contact, Resume } from "@/lib/types";

export const maxDuration = 300;

type Translated = {
  resume: Resume;
  cover_letter: string;
  keywords: string[];
  fit_reasons: string[];
};

const UNFAITHFUL = "Couldn't translate this faithfully — try again.";

/** One-call translation of an EXISTING application into another language.
    Cheaper and safer than regenerating: nothing is re-derived from the source
    documents, so no fact can be added — and a deterministic guard rejects any
    translation that drops a bullet or changes a number. Counts as ONE generation. */
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

  const body = await request.json().catch(() => ({}));
  const language: string = body.language;
  if (!LANGUAGES.some((l) => l.code === language)) {
    return NextResponse.json({ error: "Unknown language." }, { status: 422 });
  }
  const resume = body.resume as Resume | undefined;
  const cover: string = typeof body.cover_letter === "string" ? body.cover_letter : "";
  const ats = body.ats as AtsReport | undefined;
  const contact: Contact = {
    name: body.contact?.name ?? "", email: body.contact?.email ?? "",
    phone: body.contact?.phone ?? "", location: body.contact?.location ?? "",
    linkedin: body.contact?.linkedin ?? "", website: body.contact?.website ?? "",
  };
  if (!resume || !ats) {
    return NextResponse.json({ error: "Nothing to translate — generate a resume first." }, { status: 422 });
  }

  /* rate limit: same counter as generate/fix, so this is ONE generation */
  let identifier: string;
  if (demoMode) {
    identifier = demoRateKey(request);
    if (!(await withinDailyLimit(identifier, DEMO_DAILY_LIMIT))) {
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
    if (!(await withinDailyLimit(identifier, USER_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've reached today's generation limit — it resets tomorrow." },
        { status: 429 },
      );
    }
  }

  const inKeywords = [...(ats.keywords_found ?? []), ...(ats.keywords_missing ?? [])];
  const inReasons = ats.fit?.reasons ?? [];
  const system = prompts.withLanguage(prompts.TRANSLATE_SYSTEM, language);
  const user = prompts.translateUser(JSON.stringify(resume, null, 1), cover, inKeywords, inReasons, language);

  /* try the primary model, then ONE retry on the fallback model. A translation
     is only accepted if it passes the faithfulness guard. */
  const startedAt = Date.now();
  const configs: LlmConfig[] = [cfg];
  const fb = fallbackConfig(cfg);
  if (fb) configs.push(fb);

  let accepted: Translated | null = null;
  let modelUsed = cfg.model;
  let usedFallback = false;
  let transportError: unknown = null;
  let rejected = false;

  for (let i = 0; i < configs.length && !accepted; i++) {
    const c = configs[i];
    let raw: string;
    try {
      raw = await chat(c, system, user, true, 0.2);
    } catch (e) {
      transportError = e;
      continue;
    }
    try {
      const parsed = extractJson<{
        resume?: unknown; cover_letter?: unknown; keywords?: unknown; fit_reasons?: unknown;
      }>(raw);
      const tResume = coerceResume(parsed.resume);
      const tCover = typeof parsed.cover_letter === "string" ? parsed.cover_letter.trim() : "";
      const strs = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
      const tKeywords = strs(parsed.keywords);
      const tReasons = strs(parsed.fit_reasons);

      const g = checkTranslation(resume, tResume);
      const gc = checkCoverTranslation(cover, tCover);
      const keywordsOk = inKeywords.length === 0 || tKeywords.length > 0;
      if (g.ok && gc.ok && keywordsOk) {
        accepted = { resume: tResume, cover_letter: tCover, keywords: tKeywords, fit_reasons: tReasons };
        modelUsed = c.model;
        usedFallback = i > 0;
      } else {
        rejected = true;
      }
    } catch {
      rejected = true; // unparseable JSON counts as an unfaithful translation
    }
  }

  if (!accepted) {
    logGenerationEvent({ route: "fix", identifier, latencyMs: Date.now() - startedAt, success: false });
    // only surface the transport message when nothing was ever returned to judge
    if (transportError && !rejected) {
      return NextResponse.json({ error: friendlyLlmError(transportError) }, { status: 502 });
    }
    return NextResponse.json({ error: UNFAITHFUL }, { status: 502 });
  }
  logGenerationEvent({
    route: "fix", identifier, model: modelUsed,
    latencyMs: Date.now() - startedAt, success: true, usedFallback,
  });

  /* ATS is recomputed on the translated text + translated keywords. The fit
     LEVEL is a judgement of the person (unchanged); only the reasons are replaced. */
  const newAts = atsCheck(accepted.resume, contact, accepted.keywords);
  if (ats.fit) {
    newAts.fit = {
      level: ats.fit.level,
      reasons: accepted.fit_reasons.length ? accepted.fit_reasons.slice(0, 4) : ats.fit.reasons,
    };
  }

  return NextResponse.json({
    resume: accepted.resume,
    cover_letter: accepted.cover_letter,
    ats: newAts,
    language,
  });
}
