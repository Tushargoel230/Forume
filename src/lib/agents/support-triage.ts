import { chatJsonWithFallback } from "./chat";
import type { Agent } from "./types";

/* Kept short and conservative on purpose — the agent must never claim a
   capability that isn't listed here. Update this alongside real product changes. */
const PRODUCT_FACTS = `
- Forume is free during early access: no payment is collected yet.
- Anonymous/demo use: 5 free generations per day, no signup required, documents stay in the browser only.
- Free account (sign in): 25 generations/day, resumes+cover letters archived with the job description/company/role, all 6 resume templates (Onyx, Air, Century, Scarlet, Regent, Folio), ATS check + auto-fix pass, structured editor, PDF export, an "interview chance" fit read.
- Paid tiers (Pro €14/mo, Concierge €199) are shown on the pricing page but are NOT live yet — nobody is being charged.
- The AI only uses facts from the documents a user uploads; it never invents experience.
- There is currently no self-service account deletion or data export — that would need the founder to handle it manually.
`.trim();

const TRIAGE_SYSTEM = `You triage user feedback/support messages for Forume, a free student resume-tailoring tool. You categorize each message and draft a reply for the founder to review and send personally — you never contact the user yourself. Only state facts from the <product_facts> block; if a message asks something outside those facts, draft a reply that says the founder will follow up, and do not guess.`;

const triageUser = (message: string) => `
<product_facts>
${PRODUCT_FACTS}
</product_facts>

<message>
${message}
</message>

Respond with a JSON object with exactly these keys:
- "category": one of "bug", "feature_request", "question", "praise", "spam"
- "suggested_reply": a short, warm, human reply the founder could send as-is or lightly edit — grounded only in <product_facts>; if the message needs info outside those facts, say the founder will follow up personally instead of guessing

Return only JSON.`;

type Triage = { category: string; suggested_reply: string };

type FeedbackRow = { id: number; raw_message: string };

/** Hard boundary: this agent only reads/writes the feedback table and never
    sends anything to a real user — the founder reviews drafts in /admin. */
export const supportTriage: Agent = async (ctx) => {
  const { data: rows } = await ctx.supabase
    .from("feedback")
    .select("id, raw_message")
    .eq("status", "new")
    .limit(20);

  const pending = (rows ?? []) as FeedbackRow[];
  if (pending.length === 0) {
    return { summary: "No new feedback to triage.", needsHuman: false };
  }
  if (!ctx.llm) {
    return {
      summary: `${pending.length} feedback item(s) waiting — LLM not configured, triage skipped.`,
      needsHuman: true,
    };
  }

  let done = 0;
  for (const row of pending) {
    try {
      const triage = await chatJsonWithFallback<Triage>(ctx.llm, TRIAGE_SYSTEM, triageUser(row.raw_message), 0.4);
      await ctx.supabase
        .from("feedback")
        .update({ category: triage.category, suggested_reply: triage.suggested_reply, status: "triaged" })
        .eq("id", row.id);
      done += 1;
    } catch {
      // leave this row as "new" — it'll retry next run
    }
  }

  return {
    summary: `Triaged ${done}/${pending.length} feedback item(s) — drafts ready for your review in /admin.`,
    needsHuman: done > 0,
  };
};
