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

const AGENTS = [
  { id: "ops-digest", label: "Ops digest" },
  { id: "support-triage", label: "Support triage" },
  { id: "growth-content", label: "Growth content" },
  { id: "cost-watchdog", label: "Cost watchdog" },
  { id: "cybersecurity-audit", label: "Security audit" },
  { id: "finance", label: "Finance" },
  { id: "marketing-analytics", label: "Marketing" },
  { id: "design-review", label: "Design review" },
];

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between border-b border-rule pb-5">
        <Link href="/"><Logo /></Link>
        <Link href="/app" className="text-sm font-semibold text-stone hover:text-ink">Open the app →</Link>
      </header>

      <p className="text-xs font-bold uppercase tracking-[0.28em] text-crimson">Composing room · back office</p>
      <h1 className="font-display text-4xl mt-1 mb-10">Operations</h1>

      <section className="mb-12">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-stone">Agents</h2>
        <div className="flex flex-wrap gap-3">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => trigger(a.id)}
              disabled={busy === a.id}
              className="rounded-md border border-rule-dark bg-white px-4 py-2 text-sm font-semibold hover:border-ink disabled:opacity-50"
            >
              {busy === a.id ? "Running…" : `Run ${a.label}`}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-rule bg-paper p-4">
          <p className="mb-2 text-sm font-semibold">Legal checklist</p>
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

        <ul className="mt-6 space-y-3">
          {agentRuns.map((run) => (
            <li key={run.id} className="rounded-md border border-rule bg-paper p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{run.agent}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    run.status === "ok" ? "bg-pine/10 text-pine" : run.status === "error" ? "bg-crimson/10 text-crimson" : "bg-amber/10 text-amber"
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <p className="mt-1 text-stone">{run.summary ?? run.error ?? "—"}</p>
              <p className="mt-1 text-xs text-fog">{new Date(run.started_at).toLocaleString()}</p>
            </li>
          ))}
          {agentRuns.length === 0 && <p className="text-stone text-sm">No runs yet.</p>}
        </ul>
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
