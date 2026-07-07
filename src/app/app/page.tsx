"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";
import { ResumeSheet } from "@/components/ResumeSheet";
import { SettingsPanel } from "@/components/SettingsPanel";
import { getLLMConfig } from "@/lib/llm-providers";
import type { Application, AtsReport, Contact, Resume } from "@/lib/types";

type Doc = { id: number; name: string; content: string; created_at: string };
type Tab = "new" | "profile" | "history" | "settings";
type ResultTab = "resume" | "cover" | "ats";
type DemoSession = { access_token: string; user: { id: string; email: string } };

const EMPTY_CONTACT: Contact = {
  name: "", email: "", phone: "", location: "", linkedin: "", website: "",
};

function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const email = window.localStorage.getItem("forume-demo-user")?.trim();
  if (!email) return null;
  return { access_token: `demo-${email}`, user: { id: `demo-${encodeURIComponent(email)}`, email } };
}

function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("forume-demo-user");
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [session, setSession] = useState<Session | DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("new");

  useEffect(() => {
    const demoSession = getDemoSession();
    if (demoSession) {
      setSession(demoSession);
      setReady(true);
      return;
    }

    if (typeof window !== "undefined") {
      const fallbackEmail = "demo@forume.app";
      window.localStorage.setItem("forume-demo-user", fallbackEmail);
      setSession({
        access_token: `demo-${fallbackEmail}`,
        user: { id: `demo-${encodeURIComponent(fallbackEmail)}`, email: fallbackEmail },
      });
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/signin");
      else setSession(data.session);
      setReady(true);
    });
  }, [supabase, router]);

  if (!ready || !session) {
    return <main className="flex-1 grid place-items-center text-stone">Loading…</main>;
  }

  return (
    <main className="flex-1">
      <header className="sticky top-0 z-20 bg-linen/90 backdrop-blur border-b border-rule">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-[0.18em]">
            FOR<span className="text-amber">UME</span>
          </Link>
          <nav className="flex gap-1">
            {(
              [
                ["new", "New application"],
                ["profile", "Profile"],
                ["history", "History"],
                ["settings", "AI Settings"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === id ? "bg-pine text-paper" : "text-stone hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <button
            onClick={async () => {
              const demoSession = getDemoSession();
              if (demoSession) {
                clearDemoSession();
                router.replace("/");
                return;
              }
              await supabase.auth.signOut();
              router.replace("/");
            }}
            className="text-sm text-stone hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {tab === "new" && <NewApplication session={session} />}
        {tab === "profile" && <Profile session={session} />}
        {tab === "history" && <History onOpen={() => setTab("new")} />}
        {tab === "settings" && <SettingsPanel onClose={() => setTab("new")} />}
      </div>
    </main>
  );
}

/* ---------------- new application + results ---------------- */

let openedApplication: Application | null = null;
export function setOpenedApplication(a: Application) {
  openedApplication = a;
}

function NewApplication({ session }: { session: Session | DemoSession }) {
  const [jd, setJd] = useState(`Senior Product Designer — Northstar Labs is looking for a thoughtful design partner who can shape product strategy, turn research into clear flows, and help ship polished experiences across web and mobile. The ideal candidate brings strong systems thinking, sharp prototyping skills, and a calm collaborative style.`);
  const [company, setCompany] = useState("Northstar Labs");
  const [role, setRole] = useState("Senior Product Designer");
  const [template, setTemplate] = useState("slate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Application | null>(openedApplication);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [resultTab, setResultTab] = useState<ResultTab>("resume");
  const autoGeneratedRef = useRef(false);
  const supabase = supabaseBrowser();

  useEffect(() => {
    openedApplication = null;
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("forume-demo-contact") : null;
      const parsed = stored ? JSON.parse(stored) : null;
      setContact({
        name: parsed?.name ?? "",
        email: session.user.email ?? "",
        phone: parsed?.phone ?? "",
        location: parsed?.location ?? "",
        linkedin: parsed?.linkedin ?? "",
        website: parsed?.website ?? "",
      });
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setContact({
          name: data?.name ?? "",
          email: session.user.email ?? "",
          phone: data?.phone ?? "",
          location: data?.location ?? "",
          linkedin: data?.linkedin ?? "",
          website: data?.website ?? "",
        });
      });
  }, [supabase, session]);

  useEffect(() => {
    if (autoGeneratedRef.current || result) return;
    autoGeneratedRef.current = true;
    void generate();
  }, [result]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const llmConfig = getLLMConfig();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Demo-Email": session.user.email ?? "",
          ...(llmConfig ? { "X-LLM-Config": JSON.stringify(llmConfig) } : {}),
        },
        body: JSON.stringify({ jd, company, role, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResult({
        id: data.id, company, role, jd,
        resume: data.resume, cover_letter: data.cover_letter,
        ats: data.ats, template, is_demo: data.is_demo,
        created_at: data.created_at,
      });
      setResultTab("resume");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr] items-start">
      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-5">
          Job spec
        </h2>
        <Field label="Company">
          <input value={company} onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Boston Dynamics" className={inputCls} />
        </Field>
        <Field label="Role">
          <input value={role} onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Robotics Software Engineer" className={inputCls} />
        </Field>
        <Field label="Job description">
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={12}
            placeholder="Paste the full job description here…" className={inputCls} />
        </Field>
        <Field label="Template">
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputCls}>
            <option value="slate">Slate Banner</option>
            <option value="modern">Minimal Modern</option>
          </select>
        </Field>
        <button
          onClick={generate}
          disabled={busy}
          className="w-full rounded-md bg-pine px-5 py-3.5 font-semibold text-paper hover:bg-pine-deep transition-colors disabled:opacity-50"
        >
          {busy ? "Tailoring… this can take a minute" : "Generate resume & cover letter"}
        </button>
        {error && (
          <p className="mt-4 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">{error}</p>
        )}
      </div>

      {result ? (
        <ResultPanel result={result} contact={contact} resultTab={resultTab} setResultTab={setResultTab} />
      ) : (
        <div className="rounded-sm border border-dashed border-rule-dark p-12 text-center text-stone">
          <p className="font-display text-2xl mb-2 text-ink">Proof area</p>
          <p className="max-w-sm mx-auto text-sm leading-relaxed">
            Your tailored resume and cover letter appear here — scored against
            ATS checks, ready to edit and print.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  result, contact, resultTab, setResultTab,
}: {
  result: Application;
  contact: Contact;
  resultTab: ResultTab;
  setResultTab: (t: ResultTab) => void;
}) {
  return (
    <div className="rounded-sm border border-rule bg-paper">
      {result.is_demo && (
        <p className="border-b border-amber bg-amber/10 px-5 py-3 text-sm">
          <b>Sample output.</b> No AI engine is connected yet — this shows the
          layout and flow. Generation from your real profile activates once an
          engine is configured.
        </p>
      )}
      <div className="flex border-b border-rule">
        {(
          [
            ["resume", "Resume"],
            ["cover", "Cover letter"],
            ["ats", "ATS check"],
          ] as [ResultTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setResultTab(id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              resultTab === id ? "border-pine text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => window.print()}
          className="ml-auto m-2 rounded-md border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-paper transition-colors print:hidden"
        >
          Save as PDF
        </button>
      </div>
      <div className="p-5">
        {resultTab === "resume" && result.resume && (
          <ResumeSheet resume={result.resume} contact={contact} template={result.template} />
        )}
        {resultTab === "cover" && (
          <div className="print-sheet bg-white border border-rule shadow-sm p-10 whitespace-pre-wrap leading-relaxed text-[14px]">
            {result.cover_letter}
          </div>
        )}
        {resultTab === "ats" && result.ats && <AtsPanel ats={result.ats} />}
      </div>
    </div>
  );
}

function AtsPanel({ ats }: { ats: AtsReport }) {
  const verdict = ats.score >= 80 ? "passes screening" : ats.score >= 60 ? "needs work" : "will not parse";
  return (
    <div>
      <div className="flex items-center gap-6 mb-6">
        <span className="stamp text-3xl bg-paper">
          {ats.score}
          <span className="block text-[0.5rem] tracking-[0.2em]">{verdict}</span>
        </span>
        <div>
          <p className="font-semibold">ATS readiness</p>
          <p className="text-sm text-stone">
            {ats.coverage}% of the job&apos;s key terms appear in the resume
          </p>
        </div>
      </div>
      <ul className="divide-y divide-rule">
        {ats.checks.map((c) => (
          <li key={c.name} className="py-3 flex gap-3">
            <span className={c.passed ? "text-pine font-bold" : "text-amber font-bold"}>
              {c.passed ? "✓" : "✗"}
            </span>
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-sm text-stone">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {ats.keywords_found.map((k) => (
          <span key={k} className="rounded-sm border border-pine px-2.5 py-0.5 text-xs text-pine">{k}</span>
        ))}
        {ats.keywords_missing.map((k) => (
          <span key={k} className="rounded-sm border border-dashed border-rule-dark px-2.5 py-0.5 text-xs text-stone">{k}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- profile ---------------- */

function Profile({ session }: { session: Session | DemoSession }) {
  const supabase = supabaseBrowser();
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saved, setSaved] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteName, setNoteName] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const load = useCallback(async () => {
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      const storedDocs = typeof window !== "undefined" ? window.localStorage.getItem("forume-demo-docs") : null;
      const storedContact = typeof window !== "undefined" ? window.localStorage.getItem("forume-demo-contact") : null;
      if (storedContact) {
        const parsed = JSON.parse(storedContact);
        setContact({ ...EMPTY_CONTACT, ...parsed, email: session.user.email ?? "" });
      } else {
        setContact((c) => ({ ...c, email: session.user.email ?? "" }));
      }
      setDocs(storedDocs ? JSON.parse(storedDocs) : []);
      return;
    }

    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("documents").select("id, name, content, created_at").order("id", { ascending: false }),
    ]);
    if (p) setContact((c) => ({ ...c, ...p, email: session.user.email ?? "" }));
    else setContact((c) => ({ ...c, email: session.user.email ?? "" }));
    setDocs((d as Doc[]) ?? []);
  }, [supabase, session]);

  useEffect(() => { load(); }, [load]);

  async function saveContact() {
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forume-demo-contact", JSON.stringify(contact));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    await supabase.from("profiles").upsert({
      user_id: session.user.id,
      name: contact.name, phone: contact.phone, location: contact.location,
      linkedin: contact.linkedin, website: contact.website,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addNote() {
    if (!noteContent.trim()) return;
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      const newDoc = { id: Date.now(), name: noteName.trim() || "Note", content: noteContent, created_at: new Date().toISOString() };
      const nextDocs = [newDoc, ...docs];
      if (typeof window !== "undefined") window.localStorage.setItem("forume-demo-docs", JSON.stringify(nextDocs));
      setDocs(nextDocs);
      setNoteOpen(false);
      setNoteName("");
      setNoteContent("");
      return;
    }

    await supabase.from("documents").insert({
      user_id: session.user.id,
      name: noteName.trim() || "Note",
      content: noteContent,
    });
    setNoteOpen(false);
    setNoteName("");
    setNoteContent("");
    load();
  }

  async function uploadText(file: File) {
    const content = await file.text();
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      const newDoc = { id: Date.now(), name: file.name, content, created_at: new Date().toISOString() };
      const nextDocs = [newDoc, ...docs];
      if (typeof window !== "undefined") window.localStorage.setItem("forume-demo-docs", JSON.stringify(nextDocs));
      setDocs(nextDocs);
      return;
    }

    await supabase.from("documents").insert({
      user_id: session.user.id, name: file.name, content,
    });
    load();
  }

  return (
    <div className="max-w-3xl">
      <p className="text-stone mb-8 leading-relaxed">
        Your knowledge base. Everything Forume writes is drawn from what&apos;s
        stored here — and nothing else.
      </p>

      <div className="rounded-sm border border-rule bg-paper p-6 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-5">
          Contact block
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-5">
          {(
            [
              ["name", "Full name"], ["phone", "Phone"],
              ["location", "Location"], ["linkedin", "LinkedIn"],
              ["website", "Website / GitHub"],
            ] as [keyof Contact, string][]
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                value={contact[key]}
                onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
                className={inputCls}
              />
            </Field>
          ))}
          <Field label="Email (from your sign-in)">
            <input value={contact.email} disabled className={`${inputCls} opacity-60`} />
          </Field>
        </div>
        <button
          onClick={saveContact}
          className="rounded-md bg-pine px-5 py-2.5 text-sm font-semibold text-paper hover:bg-pine-deep transition-colors"
        >
          Save contact details
        </button>
        {saved && <span className="ml-3 text-sm text-pine">Saved ✓</span>}
      </div>

      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-5">
          Source documents
        </h2>
        <div className="flex flex-wrap gap-3 mb-5">
          <label className="cursor-pointer rounded-md border border-dashed border-ink px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-paper transition-colors">
            Upload text file (.txt, .md)
            <input
              type="file" accept=".txt,.md" hidden
              onChange={(e) => e.target.files?.[0] && uploadText(e.target.files[0])}
            />
          </label>
          <button
            onClick={() => setNoteOpen(true)}
            className="rounded-md border border-ink px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-paper transition-colors"
          >
            Paste resume or write a note
          </button>
        </div>
        <p className="text-xs text-stone mb-4">
          Tip: open your old resume PDF, select all, copy, and paste it here as
          a note — that&apos;s all Forume needs.
        </p>

        {noteOpen && (
          <div className="rounded-sm border border-rule bg-linen p-4 mb-4">
            <input
              value={noteName} onChange={(e) => setNoteName(e.target.value)}
              placeholder="Title (e.g. My 2026 resume)" className={`${inputCls} mb-3`}
            />
            <textarea
              value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
              rows={10} placeholder="Paste your resume text or write about your experience…"
              className={inputCls}
            />
            <div className="mt-3 flex gap-3 justify-end">
              <button onClick={() => setNoteOpen(false)} className="px-4 py-2 text-sm text-stone hover:text-ink">
                Cancel
              </button>
              <button
                onClick={addNote}
                className="rounded-md bg-pine px-5 py-2 text-sm font-semibold text-paper hover:bg-pine-deep"
              >
                Save document
              </button>
            </div>
          </div>
        )}

        <ul className="divide-y divide-rule">
          {docs.length === 0 && (
            <li className="py-3 text-sm text-stone">
              No documents yet — paste your current resume to get started.
            </li>
          )}
          {docs.map((d) => (
            <li key={d.id} className="py-3 flex items-center gap-4">
              <span className="flex-1 font-medium text-sm">{d.name}</span>
              <span className="text-xs text-stone">{(d.content.length / 1000).toFixed(1)}k chars</span>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${d.name}"?`)) return;
                  const demoSession = getDemoSession();
                  if (demoSession && session.access_token.startsWith("demo-")) {
                    const nextDocs = docs.filter((doc) => doc.id !== d.id);
                    if (typeof window !== "undefined") window.localStorage.setItem("forume-demo-docs", JSON.stringify(nextDocs));
                    setDocs(nextDocs);
                    return;
                  }
                  await supabase.from("documents").delete().eq("id", d.id);
                  load();
                }}
                className="text-stone hover:text-amber text-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- history ---------------- */

function History({ onOpen }: { onOpen: () => void }) {
  const supabase = supabaseBrowser();
  const [apps, setApps] = useState<Application[]>([]);

  const load = useCallback(async () => {
    const demoSession = getDemoSession();
    if (demoSession) {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("forume-demo-applications") : null;
      setApps(stored ? JSON.parse(stored) : []);
      return;
    }

    const { data } = await supabase
      .from("applications")
      .select("id, company, role, jd, resume, cover_letter, ats, template, is_demo, created_at")
      .order("id", { ascending: false });
    setApps((data as Application[]) ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-4">
          Past applications
        </h2>
        <ul className="divide-y divide-rule">
          {apps.length === 0 && (
            <li className="py-3 text-sm text-stone">
              Nothing yet — generate your first tailored application.
            </li>
          )}
          {apps.map((a) => (
            <li key={a.id} className="py-3.5 flex items-center gap-4">
              <button
                onClick={() => { setOpenedApplication(a); onOpen(); }}
                className="flex-1 text-left font-medium text-sm hover:text-pine"
              >
                {[a.role, a.company].filter(Boolean).join(" @ ") || "Untitled application"}
                {a.is_demo && <span className="ml-2 text-xs text-amber">(sample)</span>}
              </button>
              <span className="text-xs text-stone">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={async () => {
                  if (!confirm("Delete this application?")) return;
                  const demoSession = getDemoSession();
                  if (demoSession) {
                    const nextApps = apps.filter((app) => app.id !== a.id);
                    if (typeof window !== "undefined") window.localStorage.setItem("forume-demo-applications", JSON.stringify(nextApps));
                    setApps(nextApps);
                    return;
                  }
                  await supabase.from("applications").delete().eq("id", a.id);
                  load();
                }}
                className="text-stone hover:text-amber text-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

const inputCls =
  "w-full rounded-md border border-rule-dark bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pine";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
