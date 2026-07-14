"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

type AgentRun = {
  id: number;
  agent: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error";
  summary: string | null;
  error: string | null;
  data: Record<string, unknown> | null;
};

type Feedback = {
  id: number;
  created_at: string;
  source: string;
  raw_message: string;
  category: string | null;
  suggested_reply: string | null;
  status: "new" | "triaged" | "resolved";
};

type ContentItem = {
  id: number;
  created_at: string;
  platform: string;
  hook: string;
  script_beats: string;
  on_screen_text: string | null;
  caption: string;
  hashtags: string[];
  status: "draft" | "approved" | "rejected" | "posted";
};

const AGENTS: { id: string; label: string; group: string; cadence: string }[] = [
  { id: "ops-digest", label: "Ops digest", group: "Operations", cadence: "daily" },
  { id: "support-triage", label: "Support triage", group: "Operations", cadence: "daily" },
  { id: "cybersecurity-audit", label: "Security audit", group: "Security", cadence: "daily" },
  { id: "finance", label: "Finance", group: "Finance", cadence: "weekly" },
  { id: "cost-watchdog", label: "Cost watchdog", group: "Finance", cadence: "monthly" },
  { id: "marketing-analytics", label: "Marketing", group: "Growth", cadence: "weekly" },
  { id: "growth-content", label: "Growth content", group: "Growth", cadence: "weekly" },
  { id: "design-review", label: "Design review", group: "Product", cadence: "weekly" },
];

const AGENT_GROUPS = ["Operations", "Security", "Finance", "Growth", "Product"];

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 129600) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [contentQueue, setContentQueue] = useState<ContentItem[]>([]);
  const [message, setMessage] = useState("");
  const [legalChange, setLegalChange] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  async function load(t: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${t}` } });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Failed to load.");
    } else {
      setAgentRuns(body.agentRuns);
      setFeedback(body.feedback);
      setContentQueue(body.contentQueue ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (token) load(token);
    else setLoading(false);
  }, [token]);

  async function trigger(agent: string, input?: string) {
    if (!token) return;
    setBusy(agent);
    await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agent, input }),
    });
    await load(token);
    setBusy(null);
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !message.trim()) return;
    setBusy("feedback");
    await fetch("/api/admin/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: message.trim() }),
    });
    setMessage("");
    await load(token);
    setBusy(null);
  }

  async function resolveFeedback(id: number) {
    if (!token) return;
    setBusy(`resolve-${id}`);
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    await load(token);
    setBusy(null);
  }

  async function setContentStatus(id: number, status: string) {
    if (!token) return;
    setBusy(`content-${id}`);
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    await load(token);
    setBusy(null);
  }

  if (loading) return <main className="p-10 text-stone">Loading…</main>;

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-linen p-10">
        <div className="text-center">
          <p className="mb-4 text-stone">Sign in to view the admin dashboard.</p>
          <Link href="/signin" className="rounded-md bg-ink px-5 py-3 font-semibold text-paper">Sign in</Link>
        </div>
      </main>
    );
  }

  if (error) {
    return <main className="p-10"><p className="text-crimson">{error}</p></main>;
  }

  // Latest run per agent → the status board + the top-line health tiles.
  const latestByAgent = new Map<string, AgentRun>();
  for (const run of agentRuns) if (!latestByAgent.has(run.agent)) latestByAgent.set(run.agent, run);

  const finData = (latestByAgent.get("finance")?.data ?? latestByAgent.get("cost-watchdog")?.data) as
    | { pct_of_free_ceiling?: number; fraction_of_ceiling?: number } | undefined;
  const pctCeiling = finData?.pct_of_free_ceiling ?? finData?.fraction_of_ceiling;
  const secRun = latestByAgent.get("cybersecurity-audit");
  const securityClean = secRun ? secRun.status === "ok" && !/found \d+ issue/.test(secRun.summary ?? "") : undefined;
  const opsData = latestByAgent.get("ops-digest")?.data as { stats?: { signups?: { last_7_days?: number } } } | undefined;
  const mktData = latestByAgent.get("marketing-analytics")?.data as { stats?: { signups_last_7d?: number } } | undefined;
  const signups7d = opsData?.stats?.signups?.last_7_days ?? mktData?.stats?.signups_last_7d;
  const ranOk = AGENTS.filter((a) => latestByAgent.get(a.id)?.status === "ok").length;
  const anyError = AGENTS.some((a) => latestByAgent.get(a.id)?.status === "error");

  const tiles: { label: string; value: string; tone: "ok" | "warn" | "bad" | "muted" }[] = [
    {
      label: "Security",
      value: securityClean === undefined ? "not run" : securityClean ? "clean" : "needs review",
      tone: securityClean === undefined ? "muted" : securityClean ? "ok" : "bad",
    },
    {
      label: "Cost headroom",
      value: pctCeiling === undefined ? "not run" : `${Math.round(pctCeiling * 100)}% of free tier`,
      tone: pctCeiling === undefined ? "muted" : pctCeiling >= 0.6 ? "warn" : "ok",
    },
    {
      label: "Signups (7d)",
      value: signups7d === undefined ? "not run" : String(signups7d),
      tone: signups7d === undefined ? "muted" : signups7d > 0 ? "ok" : "warn",
    },
    {
      label: "Agents healthy",
      value: `${ranOk}/${AGENTS.length}`,
      tone: anyError ? "bad" : ranOk === AGENTS.length ? "ok" : "muted",
    },
  ];
  const toneClass = {
    ok: "text-pine", warn: "text-amber", bad: "text-crimson", muted: "text-stone",
  } as const;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between border-b border-rule pb-5">
        <Link href="/"><Logo /></Link>
        <Link href="/app" className="text-sm font-semibold text-stone hover:text-ink">Open the app →</Link>
      </header>

      <p className="text-xs font-bold uppercase tracking-[0.28em] text-crimson">Composing room · back office</p>
      <h1 className="font-display text-4xl mt-1 mb-10">Operations</h1>

      {/* System status tiles — derived from each agent's most recent run */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md border border-rule bg-paper p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fog">{t.label}</p>
            <p className={`mt-1 font-display text-xl ${toneClass[t.tone]}`}>{t.value}</p>
          </div>
        ))}
      </section>

      {/* The agent team — grouped by domain, each with its last run + a Run button */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-stone">The agent team</h2>
        <div className="space-y-6">
          {AGENT_GROUPS.map((group) => {
            const inGroup = AGENTS.filter((a) => a.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-crimson">{group}</p>
                <ul className="space-y-2">
                  {inGroup.map((a) => {
                    const run = latestByAgent.get(a.id);
                    const status = run?.status ?? "idle";
                    return (
                      <li key={a.id} className="rounded-md border border-rule bg-paper p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              status === "ok" ? "bg-pine" : status === "error" ? "bg-crimson" : status === "running" ? "bg-amber" : "bg-rule-dark"
                            }`}
                            title={status}
                          />
                          <span className="font-semibold">{a.label}</span>
                          <span className="text-xs text-fog">· {a.cadence} · {run ? timeAgo(run.started_at) : "never run"}</span>
                          <button
                            onClick={() => trigger(a.id)}
                            disabled={busy === a.id}
                            className="ml-auto rounded-md border border-rule-dark bg-white px-3 py-1 text-xs font-semibold hover:border-ink disabled:opacity-50"
                          >
                            {busy === a.id ? "Running…" : "Run now"}
                          </button>
                        </div>
                        {run?.summary && <p className="mt-2 text-sm text-stone line-clamp-3">{run.summary}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-md border border-rule bg-paper p-4">
          <p className="mb-2 text-sm font-semibold">Legal checklist <span className="font-normal text-fog">· on-demand</span></p>
          <p className="mb-3 text-xs text-stone">
            Describe a change you&apos;re about to ship (new data collected, a new
            third-party service, etc.) — this checks it against a short compliance checklist.
            Not legal advice.
          </p>
          <textarea
            value={legalChange}
            onChange={(e) => setLegalChange(e.target.value)}
            placeholder="e.g. Adding Lemon Squeezy for payments, storing billing email and country…"
            rows={3}
            className="mb-3 w-full rounded-md border border-rule-dark bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={() => trigger("legal-checklist", legalChange)}
            disabled={busy === "legal-checklist" || !legalChange.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {busy === "legal-checklist" ? "Checking…" : "Run legal checklist"}
          </button>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-stone">Content queue</h2>
        <ul className="space-y-3">
          {contentQueue.map((c) => (
            <li key={c.id} className="rounded-md border border-rule bg-paper p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-fog">{c.platform} · {c.status}</span>
                {c.status === "draft" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setContentStatus(c.id, "approved")}
                      disabled={busy === `content-${c.id}`}
                      className="text-xs font-semibold text-pine hover:underline"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setContentStatus(c.id, "rejected")}
                      disabled={busy === `content-${c.id}`}
                      className="text-xs font-semibold text-crimson hover:underline"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {c.status === "approved" && (
                  <button
                    onClick={() => setContentStatus(c.id, "posted")}
                    disabled={busy === `content-${c.id}`}
                    className="text-xs font-semibold text-ink hover:underline"
                  >
                    Mark posted
                  </button>
                )}
              </div>
              <p className="mt-2 font-semibold">{c.hook}</p>
              <p className="mt-1 whitespace-pre-line text-stone">{c.script_beats}</p>
              {c.on_screen_text && <p className="mt-1 text-xs text-fog">On-screen: {c.on_screen_text}</p>}
              <p className="mt-2 rounded-md bg-linen p-3 text-stone">{c.caption}</p>
              {c.hashtags.length > 0 && (
                <p className="mt-2 text-xs text-fog">{c.hashtags.map((h) => `#${h}`).join(" ")}</p>
              )}
            </li>
          ))}
          {contentQueue.length === 0 && <p className="text-stone text-sm">No content drafted yet.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-stone">Feedback</h2>
        <form onSubmit={submitFeedback} className="mb-6 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste a WhatsApp/email message…"
            className="flex-1 rounded-md border border-rule-dark bg-white px-4 py-2 text-sm"
          />
          <button
            disabled={busy === "feedback" || !message.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            Log
          </button>
        </form>
        <ul className="space-y-3">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-md border border-rule bg-paper p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-fog">{f.category ?? f.status}</span>
                {f.status !== "resolved" && (
                  <button
                    onClick={() => resolveFeedback(f.id)}
                    disabled={busy === `resolve-${f.id}`}
                    className="text-xs font-semibold text-crimson hover:underline"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
              <p className="mt-2">{f.raw_message}</p>
              {f.suggested_reply && (
                <p className="mt-2 rounded-md bg-linen p-3 text-stone">
                  <span className="font-semibold text-ink">Draft reply: </span>
                  {f.suggested_reply}
                </p>
              )}
            </li>
          ))}
          {feedback.length === 0 && <p className="text-stone text-sm">No feedback logged yet.</p>}
        </ul>
      </section>
    </main>
  );
}
