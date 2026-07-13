"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumeSheet, TEMPLATES } from "@/components/ResumeSheet";
import { atsCheck } from "@/lib/ats";
import { extractText } from "@/lib/extract-text";
import { fileToResizedDataUrl } from "@/lib/image";
import { maybeImportDemoData } from "@/lib/import-demo";
import type { Application, AtsReport, Contact, Fit, FitLevel, Resume } from "@/lib/types";

const DEMO_APPS_KEY = "forume-demo-applications";

function readDemoApps(): Application[] {
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_APPS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Insert or replace by id, newest first, capped so localStorage stays small. */
function writeDemoApp(app: Application) {
  const list = readDemoApps();
  const i = list.findIndex((a) => a.id === app.id);
  if (i >= 0) list[i] = app;
  else list.unshift(app);
  window.localStorage.setItem(DEMO_APPS_KEY, JSON.stringify(list.slice(0, 40)));
}

type Doc = { id: number; name: string; content: string; created_at: string };
type Tab = "new" | "profile" | "history";
type ResultTab = "resume" | "cover" | "ats" | "fit" | "edit";
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

/** Stable per-browser id so demo limits are per-device, not per-IP
    (many students share one campus IP). Created once, kept in localStorage. */
function demoDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("forume-demo-id");
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "");
    window.localStorage.setItem("forume-demo-id", id);
  }
  return id;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [session, setSession] = useState<Session | DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("new");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // a real account always wins over demo state
        await maybeImportDemoData(supabase, data.session);
        setSession(data.session);
        setReady(true);
        return;
      }
      const demoSession = getDemoSession();
      if (demoSession) {
        setSession(demoSession);
      } else {
        const fallbackEmail = "demo@forume.app";
        window.localStorage.setItem("forume-demo-user", fallbackEmail);
        setSession({
          access_token: `demo-${fallbackEmail}`,
          user: { id: `demo-${encodeURIComponent(fallbackEmail)}`, email: fallbackEmail },
        });
      }
      setReady(true);
    });
  }, [supabase, router]);

  if (!ready || !session) {
    return <main className="flex-1 grid place-items-center text-stone">Loading…</main>;
  }

  const isDemo = session.access_token.startsWith("demo-");
  const signOut = async () => {
    await supabase.auth.signOut();
    clearDemoSession();
    router.replace("/");
  };

  return (
    <main className="flex-1 lg:grid lg:grid-cols-[250px_1fr]">
      {/* desktop sidebar — the job ticket */}
      <aside className="hidden border-r border-rule bg-linen lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-rule px-6 py-5">
          <Link href="/"><Logo /></Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {NAV.map(({ id, label, hint }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`block w-full border-l-2 px-4 py-3 text-left transition-colors ${
                tab === id
                  ? "border-crimson bg-paper shadow-sm"
                  : "border-transparent hover:border-rule-dark"
              }`}
            >
              <span className={`block text-xs font-bold uppercase tracking-[0.18em] ${tab === id ? "text-ink" : "text-stone"}`}>
                {label}
              </span>
              <span className="mt-0.5 block text-xs text-stone">{hint}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-rule px-6 py-5">
          {isDemo ? (
            <>
              <p className="text-xs leading-relaxed text-stone">
                Demo — your work lives only in this browser.
              </p>
              <Link href="/signin" className="mt-2 block text-sm font-semibold text-crimson hover:underline">
                Sign in to save it →
              </Link>
            </>
          ) : (
            <>
              <p className="truncate text-xs text-stone" title={session.user.email}>{session.user.email}</p>
              <button onClick={signOut} className="mt-1.5 text-sm font-medium text-stone hover:text-ink">
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-rule bg-linen/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/"><Logo /></Link>
          {isDemo ? (
            <Link href="/signin" className="text-sm font-semibold text-crimson hover:underline">
              Sign in
            </Link>
          ) : (
            <button onClick={signOut} className="text-sm text-stone hover:text-ink">Sign out</button>
          )}
        </div>
        <nav className="flex border-t border-rule">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 border-b-2 px-2 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                tab === id ? "border-crimson text-ink" : "border-transparent text-stone"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <section className="min-w-0 bg-linen">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <PageHeader tab={tab} />
          {tab === "new" && <NewApplication session={session} />}
          {tab === "profile" && <Profile session={session} />}
          {tab === "history" && <History onOpen={() => setTab("new")} />}
        </div>
      </section>
    </main>
  );
}

const NAV: { id: Tab; label: string; hint: string }[] = [
  { id: "new", label: "New application", hint: "Paste a job, pull a proof" },
  { id: "profile", label: "Your sources", hint: "Resumes, notes, contact" },
  { id: "history", label: "Archive", hint: "Everything you've generated" },
];

const HEADERS: Record<Tab, { kicker: string; title: string; note: string }> = {
  new: {
    kicker: "Composing room",
    title: "Set the type.",
    note: "Paste the job description — Forume writes from your sources, nothing else.",
  },
  profile: {
    kicker: "Source material",
    title: "What Forume knows.",
    note: "Everything generated is drawn from the documents and details stored here.",
  },
  history: {
    kicker: "The archive",
    title: "Every proof you've pulled.",
    note: "Reopen, reprint, or discard past applications.",
  },
};

function PageHeader({ tab }: { tab: Tab }) {
  const h = HEADERS[tab];
  return (
    <header className="mb-8 border-b border-rule pb-6 lg:mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-crimson">{h.kicker}</p>
      <h1 className="font-display mt-2 text-3xl leading-tight sm:text-4xl">{h.title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone">{h.note}</p>
    </header>
  );
}

/* ---------------- new application + results ---------------- */

let openedApplication: Application | null = null;
export function setOpenedApplication(a: Application) {
  openedApplication = a;
}

function NewApplication({ session }: { session: Session | DemoSession }) {
  // when opened from the archive, restore the whole application — JD included
  const [jd, setJd] = useState(openedApplication?.jd ?? "");
  const [company, setCompany] = useState(openedApplication?.company ?? "");
  const [role, setRole] = useState(openedApplication?.role ?? "");
  const [template, setTemplate] = useState(openedApplication?.template ?? "slate");
  const [busy, setBusy] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Application | null>(openedApplication);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [resultTab, setResultTab] = useState<ResultTab>("resume");
  // null = still counting; drives the upload-first empty state for new visitors
  const [docCount, setDocCount] = useState<number | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
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
        photo: parsed?.photo ?? undefined,
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
          photo: data?.photo ?? undefined,
        });
      });
  }, [supabase, session]);

  // count existing source docs so a brand-new visitor is shown "upload first"
  useEffect(() => {
    const isDemo = session.access_token.startsWith("demo-");
    if (isDemo) {
      try {
        const d = JSON.parse(window.localStorage.getItem("forume-demo-docs") ?? "[]");
        setDocCount(Array.isArray(d) ? d.length : 0);
      } catch {
        setDocCount(0);
      }
    } else {
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .then(({ count }) => setDocCount(count ?? 0));
    }
  }, [supabase, session]);

  /** Upload a resume straight from the empty state — same extraction + storage
      as the Profile "Source documents" card, so it flows into generation. */
  async function uploadResume(file: File) {
    setUploadErr("");
    setUploadingResume(true);
    try {
      const content = await extractText(file);
      const isDemo = session.access_token.startsWith("demo-");
      if (isDemo) {
        const prev: Doc[] = JSON.parse(window.localStorage.getItem("forume-demo-docs") ?? "[]");
        const nextDocs = [
          { id: Date.now(), name: file.name, content, created_at: new Date().toISOString() },
          ...prev,
        ];
        window.localStorage.setItem("forume-demo-docs", JSON.stringify(nextDocs));
        setDocCount(nextDocs.length);
      } else {
        const { error: insertErr } = await supabase
          .from("documents")
          .insert({ user_id: session.user.id, name: file.name, content });
        if (insertErr) throw new Error(insertErr.message);
        setDocCount((n) => (n ?? 0) + 1);
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingResume(false);
    }
  }

  async function generate() {
    if (!jd.trim()) {
      setError("Paste a job description first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const isDemo = session.access_token.startsWith("demo-");
      // demo documents live in the browser, so the server needs them per-request
      let documents: { name: string; content: string }[] = [];
      if (isDemo && typeof window !== "undefined") {
        try {
          documents = JSON.parse(window.localStorage.getItem("forume-demo-docs") ?? "[]");
        } catch { documents = []; }
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(isDemo ? { "X-Demo-Email": session.user.email ?? "", "X-Demo-Id": demoDeviceId() } : {}),
        },
        body: JSON.stringify({
          jd, company, role, template,
          // photo is presentation-only — never send the data URL to the server/LLM
          ...(isDemo ? { documents, contact: { ...contact, photo: undefined } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const app: Application = {
        id: data.id, company, role, jd,
        resume: data.resume, cover_letter: data.cover_letter,
        ats: data.ats, template, show_photo: true, is_demo: data.is_demo,
        created_at: data.created_at,
      };
      setResult(app);
      setResultTab("resume");
      // signed-in rows are saved server-side; the demo archive lives here
      if (isDemo) writeDemoApp(app);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Merge a change into the shown result and persist it to the archive. */
  async function updateResult(patch: Partial<Application>) {
    if (!result) return;
    const updated = { ...result, ...patch };
    setResult(updated);
    if (session.access_token.startsWith("demo-")) {
      writeDemoApp(updated);
    } else if (typeof updated.id === "number") {
      await supabase
        .from("applications")
        .update({
          resume: updated.resume, cover_letter: updated.cover_letter,
          ats: updated.ats, template: updated.template,
          show_photo: updated.show_photo ?? true,
        })
        .eq("id", updated.id);
    }
  }

  /** One targeted engine pass that weaves the flagged keywords in — truthfully. */
  async function fixAts() {
    if (!result?.resume || !result.ats) return;
    setFixing(true);
    setError("");
    try {
      const isDemo = session.access_token.startsWith("demo-");
      let documents: { name: string; content: string }[] = [];
      if (isDemo) {
        try {
          documents = JSON.parse(window.localStorage.getItem("forume-demo-docs") ?? "[]");
        } catch { documents = []; }
      }
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(isDemo ? { "X-Demo-Email": session.user.email ?? "", "X-Demo-Id": demoDeviceId() } : {}),
        },
        body: JSON.stringify({
          jd: result.jd, resume: result.resume, ats: result.ats,
          contact: { ...contact, photo: undefined },
          ...(isDemo ? { documents } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await updateResult({ resume: data.resume, ats: data.ats });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFixing(false);
    }
  }

  function saveEdit(resume: Resume, cover: string) {
    if (!result) return;
    const keywords = [
      ...(result.ats?.keywords_found ?? []),
      ...(result.ats?.keywords_missing ?? []),
    ];
    const ats = atsCheck(resume, contact, keywords);
    if (result.ats?.fit) ats.fit = result.ats.fit; // fit judges the person, not the draft
    void updateResult({ resume, cover_letter: cover, ats });
    setResultTab("resume");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr] items-start">
      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2 mb-5">
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
        <button
          onClick={generate}
          disabled={busy}
          className="w-full rounded-md bg-ink px-5 py-3.5 font-semibold text-paper hover:bg-crimson transition-colors disabled:opacity-50"
        >
          {busy ? "Tailoring… this can take a minute" : "Generate resume & cover letter"}
        </button>
        {error && (
          <p className="mt-4 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">{error}</p>
        )}
      </div>

      {result ? (
        <ResultPanel
          result={result} contact={contact} resultTab={resultTab} setResultTab={setResultTab}
          onTemplateChange={(t) => { setTemplate(t); void updateResult({ template: t }); }}
          onTogglePhoto={(v) => void updateResult({ show_photo: v })}
          onFix={fixAts} fixing={fixing} onSaveEdit={saveEdit}
        />
      ) : docCount === 0 ? (
        <div className="cropmarks bg-paper px-8 py-14 text-center shadow-[0_14px_40px_-24px_rgba(31,33,36,0.3)] sm:px-14">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-crimson">Step one</p>
          <h2 className="font-display mt-2 text-3xl leading-tight">Upload your resume to start</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone">
            Drop in your current resume — Forume reads it and rewrites it for each job you paste.
            No sign-up needed; it stays in your browser.
          </p>
          <div className="mt-7 flex justify-center">
            <label className={`cursor-pointer rounded-md bg-ink px-6 py-3.5 font-semibold text-paper transition-colors ${uploadingResume ? "opacity-50" : "hover:bg-crimson"}`}>
              {uploadingResume ? "Reading your resume…" : "Upload resume (PDF, DOCX, TXT)"}
              <input
                type="file" accept=".pdf,.docx,.txt,.md" hidden disabled={uploadingResume}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadResume(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {uploadErr && (
            <p className="mx-auto mt-4 max-w-sm rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm text-ink">{uploadErr}</p>
          )}
          <p className="mx-auto mt-6 max-w-xs text-xs leading-relaxed text-stone">
            Prefer to paste it instead? Open <b>Your sources</b> in the sidebar.
          </p>
        </div>
      ) : (
        <div className="cropmarks bg-paper px-8 py-12 text-center text-stone shadow-[0_14px_40px_-24px_rgba(31,33,36,0.3)] sm:px-14">
          {/* ghost proof: the sheet your resume will be typeset on */}
          <div className={`relative mx-auto max-w-md border border-rule bg-white px-9 pb-10 pt-9 text-left shadow-[0_10px_30px_-18px_rgba(31,33,36,0.35)] ${busy ? "animate-pulse" : ""}`}>
            <div className="h-4 w-40 rounded-[2px] bg-ink/15" />
            <div className="mt-2.5 h-2 w-56 rounded-[2px] bg-rule" />
            <div className="mt-1.5 h-2 w-44 rounded-[2px] bg-rule" />
            {[["w-20", 3], ["w-24", 4], ["w-16", 2]].map(([w, lines], s) => (
              <div key={s} className="mt-7">
                <div className={`h-2 ${w} rounded-[2px] bg-crimson/25`} />
                <div className="mt-2 border-t border-rule pt-2.5 space-y-1.5">
                  {Array.from({ length: lines as number }).map((_, i) => (
                    <div key={i} className={`h-2 rounded-[2px] bg-rule ${i % 2 ? "w-4/5" : "w-full"}`} />
                  ))}
                </div>
              </div>
            ))}
            <span
              className={`stamp absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/85 text-xl ${
                busy ? "text-crimson" : "text-rule-dark"
              }`}
            >
              {busy ? "Setting type…" : "Awaiting copy"}
            </span>
          </div>
          <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed">
            {busy
              ? "Reading the job, weighing it against your sources, pulling the proof — about half a minute."
              : "Paste a job on the left. Your resume is typeset onto this sheet — scored, fit-checked, ready to send."}
          </p>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  result, contact, resultTab, setResultTab, onTemplateChange, onTogglePhoto, onFix, fixing, onSaveEdit,
}: {
  result: Application;
  contact: Contact;
  resultTab: ResultTab;
  setResultTab: (t: ResultTab) => void;
  onTemplateChange: (t: string) => void;
  onTogglePhoto: (v: boolean) => void;
  onFix: () => void;
  fixing: boolean;
  onSaveEdit: (resume: Resume, cover: string) => void;
}) {
  const showPhoto = result.show_photo ?? true;
  return (
    <div className="cropmarks border border-rule bg-paper shadow-[0_14px_40px_-24px_rgba(31,33,36,0.3)]">
      {result.is_demo && (
        <p className="border-b border-amber bg-amber/10 px-5 py-3 text-sm">
          <b>Sample output.</b> Upload your resume under <b>Your sources</b> and
          generate again — Forume will write from your real experience.
        </p>
      )}
      <div className="flex flex-wrap items-center border-b border-rule">
        {(
          [
            ["resume", "Resume"],
            ["cover", "Cover letter"],
            ["ats", "ATS check"],
            ["fit", "Fit"],
            ["edit", "Edit"],
          ] as [ResultTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setResultTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors sm:px-5 ${
              resultTab === id ? "border-crimson text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 p-2 print:hidden">
          {contact.photo && (
            <label
              title="Include your photo on the resume"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-rule-dark bg-white px-2.5 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={showPhoto}
                onChange={(e) => onTogglePhoto(e.target.checked)}
                className="accent-crimson"
              />
              Photo
            </label>
          )}
          <select
            value={result.template}
            onChange={(e) => onTemplateChange(e.target.value)}
            title="Switch the typeset style — reprints instantly"
            className="rounded-md border border-rule-dark bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-paper transition-colors"
          >
            Save as PDF
          </button>
        </div>
      </div>
      <div className="p-5">
        {resultTab === "resume" && result.resume && (
          <ResumeSheet resume={result.resume} contact={contact} template={result.template} showPhoto={showPhoto} />
        )}
        {resultTab === "cover" && (
          <div className="print-sheet bg-white border border-rule shadow-sm p-10 whitespace-pre-wrap leading-relaxed text-[14px]">
            {result.cover_letter}
          </div>
        )}
        {resultTab === "ats" && result.ats && (
          <AtsPanel ats={result.ats} onFix={onFix} fixing={fixing} canFix={!result.is_demo} />
        )}
        {resultTab === "fit" && <FitPanel fit={result.ats?.fit} isSample={result.is_demo} />}
        {resultTab === "edit" && result.resume && (
          <ResumeEditor
            resume={result.resume}
            coverLetter={result.cover_letter ?? ""}
            onSave={onSaveEdit}
            onCancel={() => setResultTab("resume")}
          />
        )}
      </div>
    </div>
  );
}

function AtsPanel({
  ats, onFix, fixing, canFix,
}: {
  ats: AtsReport;
  onFix: () => void;
  fixing: boolean;
  canFix: boolean;
}) {
  const verdict = ats.score >= 80 ? "Passes screening" : ats.score >= 60 ? "Needs work" : "Will not parse";
  const hasProblems = ats.keywords_missing.length > 0 || ats.checks.some((c) => !c.passed);
  // semicircle arc length ≈ 151 for r=48 — reveal the scored share of it
  const ARC = 151;
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* the gauge — same proof language as the landing page */}
      <div className="cropmarks self-start bg-white p-8 text-center shadow-[0_14px_40px_-24px_rgba(31,33,36,0.3)]">
        <svg viewBox="0 0 120 70" className="mx-auto w-48" aria-hidden="true">
          <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#e5e1d6" strokeWidth="7" strokeLinecap="round" />
          <path
            d="M 12 62 A 48 48 0 0 1 108 62" fill="none"
            stroke={ats.score >= 60 ? "#c5283d" : "#c77e2e"}
            strokeWidth="7" strokeLinecap="round" className="arc-score"
            style={{ strokeDasharray: ARC, strokeDashoffset: ARC - (ARC * ats.score) / 100 }}
          />
        </svg>
        <p className="-mt-7 font-display text-5xl">{ats.score}</p>
        <p className="mt-1.5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-crimson">
          ATS readiness
        </p>
        <span className={`stamp mt-5 inline-block text-sm ${ats.score >= 60 ? "text-crimson" : "text-amber"}`}>
          {verdict}
        </span>
        <p className="mt-5 border-t border-rule pt-4 text-xs leading-relaxed text-stone">
          {ats.coverage}% of the job&apos;s key terms appear in your resume.
        </p>
        {canFix && hasProblems && (
          <>
            <button
              onClick={onFix}
              disabled={fixing}
              className="mt-4 w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-crimson disabled:opacity-50"
            >
              {fixing ? "Reworking the proof…" : "Fix these automatically"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-stone">
              One engine pass weaves the missing terms in — only where your
              sources support them. Nothing gets invented.
            </p>
          </>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2">
          Checks parsers run
        </h3>
        <ul className="divide-y divide-rule">
          {ats.checks.map((c) => (
            <li key={c.name} className="py-3 flex gap-3">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                c.passed ? "bg-crimson/10 text-crimson" : "bg-amber/15 text-amber"
              }`}>
                {c.passed ? "✓" : "✗"}
              </span>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-sm text-stone">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2">
          The job&apos;s language
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ats.keywords_found.map((k) => (
            <span key={k} className="rounded-sm bg-crimson/10 border border-crimson/40 px-2.5 py-0.5 text-xs font-medium text-crimson">
              ✓ {k}
            </span>
          ))}
          {ats.keywords_missing.map((k) => (
            <span key={k} className="rounded-sm border border-dashed border-rule-dark px-2.5 py-0.5 text-xs text-stone">
              {k}
            </span>
          ))}
        </div>
        {ats.keywords_missing.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-stone">
            Dashed terms appear in the job but not your resume — add them only
            where they&apos;re true of you.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- fit verdict ---------------- */

const FIT_META: Record<FitLevel, { label: string; note: string; tone: "crimson" | "amber" | "stone"; bands: number }> = {
  strong: { label: "Strong fit", note: "Clearly qualified — apply with confidence.", tone: "crimson", bands: 5 },
  good: { label: "Good fit", note: "A solid match with minor gaps.", tone: "crimson", bands: 4 },
  fair: { label: "Possible fit", note: "Plausible — but expect a competitive field.", tone: "amber", bands: 3 },
  stretch: { label: "A stretch", note: "Real gaps. It will take a strong angle.", tone: "amber", bands: 2 },
  weak: { label: "Not a fit yet", note: "Your background doesn't support this one today.", tone: "stone", bands: 1 },
};

const TONE_TEXT = { crimson: "text-crimson", amber: "text-amber", stone: "text-stone" } as const;
const TONE_BAND = { crimson: "bg-crimson", amber: "bg-amber", stone: "bg-stone" } as const;

function FitPanel({ fit, isSample }: { fit?: Fit; isSample: boolean }) {
  if (!fit) {
    return (
      <div className="px-6 py-14 text-center text-stone">
        <span className="stamp text-lg text-rule-dark">Unjudged</span>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed">
          {isSample
            ? "The fit verdict is written when Forume reads a job against your own documents — add your sources and generate again."
            : "This application was generated before fit verdicts existed — generate again to get one."}
        </p>
      </div>
    );
  }

  const m = FIT_META[fit.level];
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="cropmarks self-start bg-white p-8 text-center shadow-[0_14px_40px_-24px_rgba(31,33,36,0.3)]">
        {/* five-band ledger: one band per verdict step, weakest to strongest */}
        <div className="mx-auto flex max-w-[220px] items-end gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((band) => (
            <span
              key={band}
              className={`flex-1 rounded-[1px] transition-colors ${
                band <= m.bands ? TONE_BAND[m.tone] : "bg-rule"
              }`}
              style={{ height: `${10 + band * 7}px` }}
            />
          ))}
        </div>
        <p className={`font-display mt-6 text-3xl leading-tight ${TONE_TEXT[m.tone]}`}>{m.label}</p>
        <p className="mt-1.5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-stone">
          Interview outlook
        </p>
        <p className="mt-5 border-t border-rule pt-4 text-xs leading-relaxed text-stone">{m.note}</p>
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2">
          The honest read
        </h3>
        <ul className="mt-4 space-y-4">
          {fit.reasons.map((r) => (
            <li key={r} className="flex items-start gap-3.5 text-sm leading-relaxed">
              <span className={`mt-0.5 ${TONE_TEXT[m.tone]}`}>—</span>
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-7 border-t border-rule pt-4 text-xs leading-relaxed text-stone">
          Judged from your source documents against this job description — the
          resume wording doesn&apos;t change it. A &ldquo;stretch&rdquo; can
          still be worth sending; the read tells you what to lead with.
        </p>
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOk, setUploadOk] = useState("");

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
      photo: contact.photo ?? null,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /** Resize + compress the chosen image, stash it on contact, and persist. */
  async function uploadPhoto(file: File) {
    setUploadError("");
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const next = { ...contact, photo: dataUrl };
      setContact(next);
      const demoSession = getDemoSession();
      if (demoSession && session.access_token.startsWith("demo-")) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("forume-demo-contact", JSON.stringify(next));
        }
      } else {
        await supabase.from("profiles").upsert({
          user_id: session.user.id,
          name: next.name, phone: next.phone, location: next.location,
          linkedin: next.linkedin, website: next.website,
          photo: dataUrl, updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removePhoto() {
    const next = { ...contact, photo: undefined };
    setContact(next);
    const demoSession = getDemoSession();
    if (demoSession && session.access_token.startsWith("demo-")) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forume-demo-contact", JSON.stringify(next));
      }
    } else {
      await supabase.from("profiles").upsert({
        user_id: session.user.id,
        name: next.name, phone: next.phone, location: next.location,
        linkedin: next.linkedin, website: next.website,
        photo: null, updated_at: new Date().toISOString(),
      });
    }
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

  async function uploadFile(file: File) {
    setUploadError("");
    setUploadOk("");
    setUploading(true);
    try {
      const content = await extractText(file);
      const demoSession = getDemoSession();
      if (demoSession && session.access_token.startsWith("demo-")) {
        const newDoc = { id: Date.now(), name: file.name, content, created_at: new Date().toISOString() };
        const nextDocs = [newDoc, ...docs];
        if (typeof window !== "undefined") window.localStorage.setItem("forume-demo-docs", JSON.stringify(nextDocs));
        setDocs(nextDocs);
      } else {
        const { error } = await supabase.from("documents").insert({
          user_id: session.user.id, name: file.name, content,
        });
        if (error) throw new Error(error.message);
        await load();
      }
      setUploadOk(`✓ ${file.name} — ${(content.length / 1000).toFixed(1)}k characters extracted`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-sm border border-rule bg-paper p-6 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2 mb-5">
          Contact block
        </h2>

        {/* Optional European-style CV photo */}
        <div className="mb-5 flex items-start gap-4">
          <div className="w-24 shrink-0">
            {contact.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.photo}
                alt="Your CV photo"
                className="aspect-[3.5/4.5] w-24 rounded-md border border-rule object-cover"
              />
            ) : (
              <div className="grid aspect-[3.5/4.5] w-24 place-items-center rounded-md border border-dashed border-rule-dark text-center text-[11px] leading-tight text-stone">
                No photo
              </div>
            )}
          </div>
          <div className="pt-1">
            <p className="text-sm font-medium">Photo (optional)</p>
            <p className="mb-3 text-xs text-stone">
              Common on European CVs. A head-and-shoulders portrait works best.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-md border border-ink px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper">
                {contact.photo ? "Replace" : "Add photo"}
                <input
                  type="file" accept="image/*" hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {contact.photo && (
                <button
                  onClick={removePhoto}
                  className="rounded-md border border-rule-dark px-3 py-1.5 text-sm font-semibold text-stone hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

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
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-crimson transition-colors"
        >
          Save contact details
        </button>
        {saved && <span className="ml-3 text-sm text-crimson">Saved ✓</span>}
      </div>

      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2 mb-5">
          Source documents
        </h2>
        <div className="flex flex-wrap gap-3 mb-3">
          <label className={`cursor-pointer rounded-md border border-dashed border-ink px-4 py-2.5 text-sm font-semibold transition-colors ${uploading ? "opacity-50" : "hover:bg-ink hover:text-paper"}`}>
            {uploading ? "Reading file…" : "Upload resume (PDF, DOCX, TXT)"}
            <input
              type="file" accept=".pdf,.docx,.txt,.md" hidden disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => setNoteOpen(true)}
            className="rounded-md border border-ink px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-paper transition-colors"
          >
            Write a note
          </button>
        </div>
        {uploadOk && <p className="mb-3 text-sm text-crimson">{uploadOk}</p>}
        {uploadError && (
          <p className="mb-3 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">{uploadError}</p>
        )}

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
                className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-paper hover:bg-crimson"
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
      .select("id, company, role, jd, resume, cover_letter, ats, template, show_photo, is_demo, created_at")
      .order("id", { ascending: false });
    setApps((data as Application[]) ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-crimson border-b border-rule pb-2 mb-4">
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
                className="min-w-0 flex-1 text-left text-sm hover:text-crimson"
              >
                <span className="block font-medium">
                  {[a.role, a.company].filter(Boolean).join(" @ ") || "Untitled application"}
                  {a.is_demo && <span className="ml-2 text-xs text-amber">(sample)</span>}
                </span>
                {a.jd && (
                  <span className="mt-0.5 block truncate text-xs font-normal text-stone">{a.jd}</span>
                )}
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
  "w-full rounded-md border border-rule-dark bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
