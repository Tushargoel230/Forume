import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

/* What's already true today — keep in sync with real changes so the agent
   doesn't flag things that are already handled, or miss things that aren't. */
const CURRENT_STATE = `
- Legal pages already exist and are live: /privacy, /terms, /imprint.
- Data hosted in Supabase eu-west-1 (EU). Users are mostly EU/German university students — GDPR applies.
- Personal data collected: name, email, phone, location, LinkedIn/website, and the full content of uploaded resumes/documents (which can include prior employers, education, sometimes personal details users chose to include).
- No payment processor is integrated yet — the product is free, nobody is charged.
- No analytics/ads third party beyond Vercel Analytics (pageviews) and Supabase itself.
- No self-service account deletion or data export exists yet.
`.trim();

const CHECKLIST_SYSTEM = `You are a pragmatic, non-lawyer compliance reviewer for a small, free, solo-founder EU student product (Forume). You are NOT giving legal advice — you are flagging what a founder should check or ask a real lawyer about before shipping a described change. Be concrete and short. Only flag things relevant to the described change; don't pad with generic advice.`;

const checklistUser = (currentState: string, change: string) => `
<current_state>
${currentState}
</current_state>

<planned_change>
${change}
</planned_change>

Review the planned change against this checklist and respond with a JSON object with exactly these keys:
- "new_pii_or_processing": true/false — does this add a new category of personal data collected or processed?
- "new_third_party_processor": true/false — does this send user data to a new external service (payment, email, analytics, AI provider)?
- "affects_retention_or_deletion": true/false — does this change what data is kept or how it can be deleted?
- "legal_pages_need_update": true/false — do /privacy, /terms, or /imprint likely need a text update because of this?
- "flags": array of 1-5 short, concrete action items (or empty array if genuinely nothing to flag) — each one thing the founder should actually check or do, not generic disclaimers
- "summary": one or two plain sentences a solo founder can act on immediately

Return only JSON.`;

type ChecklistResult = {
  new_pii_or_processing: boolean;
  new_third_party_processor: boolean;
  affects_retention_or_deletion: boolean;
  legal_pages_need_update: boolean;
  flags: string[];
  summary: string;
};

/** Manual-only (never scheduled): the founder runs this from /admin before
    shipping a data-model or processor change, describing the change as input. */
export const legalChecklist: Agent = async (ctx) => {
  const change = typeof ctx.input === "string" ? ctx.input.trim() : "";
  if (!change) {
    return {
      summary: "No change description provided — describe what you're about to ship in /admin and run this again.",
      needsHuman: true,
    };
  }
  if (!ctx.llm) {
    return { summary: "Legal checklist skipped — LLM not configured.", needsHuman: true };
  }

  const result = await chatJsonWithFallback<ChecklistResult>(
    ctx.llm, CHECKLIST_SYSTEM, checklistUser(CURRENT_STATE, change), 0.3,
  );

  const anyFlag =
    result.new_pii_or_processing ||
    result.new_third_party_processor ||
    result.affects_retention_or_deletion ||
    result.legal_pages_need_update ||
    result.flags.length > 0;

  return {
    summary: result.summary,
    data: result,
    needsHuman: anyFlag,
  };
};
