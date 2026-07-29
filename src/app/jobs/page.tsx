"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { COUNTRIES, countryLabel } from "@/lib/jobs/scope";
import { DEFAULT_SCOPE, type ScoredJob, type SearchScope } from "@/lib/jobs/types";
import type { FitLevel } from "@/lib/types";

type DemoSession = { access_token: string; user: { id: string; email: string } };

function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const email = window.localStorage.getItem("forume-demo-user")?.trim();
  if (!email) return null;
  return { access_token: `demo-${email}`, user: { id: `demo-${encodeURIComponent(email)}`, email } };
}

/* five-band fit → rubber-stamp label + tone */
const FIT_META: Record<FitLevel, { label: string; cls: string }> = {
  strong: { label: "Strong fit", cls: "text-crimson border-crimson" },
  good: { label: "Good fit", cls: "text-pine border-pine" },
  fair: { label: "Fair", cls: "text-ink border-ink" },
  stretch: { label: "Stretch", cls: "text-amber border-amber" },
  weak: { label: "Long shot", cls: "text-stone border-rule-dark" },
};

const inputCls =
  "w-full rounded-md border border-rule-dark bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function JobsPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [session, setSession] = useState<Session | DemoSession | null>(null);
  const [ready, setReady] = useState(false);

  const [scope, setScope] = useState<SearchScope>(DEFAULT_SCOPE);
  const [jobs, setJobs] = useState<ScoredJob[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsResume, setNeedsResume] = useState(false);
  const [started, setStarted] = useState(false);
  const didInit = useRef(false);

  /* ---- session ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session);
      else setSession(getDemoSession() ?? { access_token: "demo-demo@forume.app", user: { id: "demo", email: "demo@forume.app" } });
      setReady(true);
    });
  }, [supabase]);

  const isDemo = (s: Session | DemoSession) => s.access_token.startsWith("demo-");

  const runSearch = useCallback(
    async (s: SearchScope, current: Session | DemoSession) => {
      setBusy(true);
      setError("");
      setStarted(true);
      try {
        const demo = isDemo(current);
        let documents: { name: string; content: string }[] = [];
        let contact: Record<string, string> | undefined;
        if (demo && typeof window !== "undefined") {
          try { documents = JSON.parse(window.localStorage.getItem("forume-demo-docs") ?? "[]"); } catch {}
          try { contact = JSON.parse(window.localStorage.getItem("forume-demo-contact") ?? "null") ?? undefined; } catch {}
        }
        const res = await fetch("/api/jobs/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${current.access_token}`,
            ...(demo ? { "X-Demo-Email": current.user.email ?? "" } : {}),
          },
          body: JSON.stringify({ scope: s, ...(demo ? { documents, contact } : {}) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setNeedsResume(Boolean(data.needsResume));
        setJobs(data.jobs ?? []);
        setSources(data.sources ?? []);
        setCheckedAt(data.checkedAt ?? new Date().toISOString());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* ---- first load: show last saved results only (signed-in). Never auto-search
     — a fresh search is slow (live sources + engine), so it runs only when the
     user hits Search / Refresh. ---- */
  useEffect(() => {
    if (!ready || !session || didInit.current) return;
    didInit.current = true;
    if (isDemo(session)) return; // demo keeps no server state — wait for the user
    (async () => {
      try {
        const res = await fetch("/api/jobs/search", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await res.json();
        if (data.scope) setScope((sc) => ({ ...sc, ...data.scope }));
        if ((data.jobs ?? []).length) {
          setJobs(data.jobs);
          setCheckedAt(data.lastRunAt);
          setStarted(true); // showing cached results; Refresh re-runs live
        }
      } catch {}
    })();
  }, [ready, session]);

  if (!ready || !session) {
    return <main className="min-h-screen grid place-items-center text-stone">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-linen">
      <header className="sticky top-0 z-20 border-b border-rule bg-linen/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app" className="text-stone hover:text-ink">Composing room</Link>
            <span className="font-semibold text-ink">Job Match</span>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-crimson">Live listings</p>
          <h1 className="mt-2 font-display text-4xl text-ink">Job Match</h1>
          <p className="mt-3 leading-relaxed text-stone">
            Real, currently-open postings scored against your own resume — honestly.
            Pick a scope and Forume keeps checking the sources for fresh matches.
          </p>
        </div>

        <SpecSheet scope={scope} setScope={setScope} busy={busy} started={started} onSearch={() => runSearch(scope, session)} />

        {/* freshness + sources */}
        {started && !needsResume && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone">
            {checkedAt && <span>Checked {timeAgo(checkedAt)}</span>}
            {sources.length > 0 && (
              <span>Live sources: <span className="text-ink">{sources.join(", ")}</span></span>
            )}
            {jobs.some((j) => j.isNew) && <span className="text-crimson">• new since your last visit</span>}
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-md border border-amber bg-amber/10 px-4 py-3 text-sm">{error}</p>
        )}

        {/* states */}
        {needsResume ? (
          <EmptyResume />
        ) : busy && jobs.length === 0 ? (
          <LoadingGrid />
        ) : !started && jobs.length === 0 && !busy ? (
          <IdlePrompt onSearch={() => runSearch(scope, session)} />
        ) : jobs.length === 0 && started && !busy ? (
          <NoResults />
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {jobs.map((j, i) => (
              <Reveal key={`${j.source}-${j.sourceJobId}`} delay={Math.min(i, 6) * 0.04}>
                <JobCard job={j} onGenerate={() => {
                  if (typeof window !== "undefined") {
                    window.sessionStorage.setItem(
                      "forume-jobmatch-prefill",
                      JSON.stringify({ jd: `${j.title} — ${j.company}\n\n${j.description}`, company: j.company, role: j.title }),
                    );
                  }
                  router.push("/app");
                }} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

/* ---------------- filter bar (the "spec sheet") ---------------- */

function SpecSheet({
  scope, setScope, busy, started, onSearch,
}: {
  scope: SearchScope;
  setScope: (s: SearchScope) => void;
  busy: boolean;
  started: boolean;
  onSearch: () => void;
}) {
  return (
    <div className="cropmarks rounded-sm border border-rule bg-paper p-6">
      <h2 className="mb-5 border-b border-rule pb-2 text-xs font-bold uppercase tracking-[0.22em] text-crimson">
        Search scope
      </h2>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">Role / domain</span>
          <input
            value={scope.keywords}
            onChange={(e) => setScope({ ...scope, keywords: e.target.value })}
            placeholder="e.g. Robotics Engineer"
            className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">Country</span>
          <select value={scope.country} onChange={(e) => setScope({ ...scope, country: e.target.value })} className={inputCls}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">Posted</span>
          <select value={scope.datePosted} onChange={(e) => setScope({ ...scope, datePosted: e.target.value as SearchScope["datePosted"] })} className={inputCls}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone">Arrangement</span>
          <div className="inline-flex overflow-hidden rounded-md border border-rule-dark">
            {(["any", "remote", "hybrid", "onsite"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setScope({ ...scope, remote: r })}
                className={`px-3.5 py-2 text-sm capitalize transition-colors ${
                  scope.remote === r ? "bg-ink text-paper" : "bg-white text-stone hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onSearch}
          disabled={busy}
          className="rounded-md bg-crimson px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-50"
        >
          {busy ? "Searching…" : started ? "Refresh now" : "Search"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- job card ---------------- */

function JobCard({ job, onGenerate }: { job: ScoredJob; onGenerate: () => void }) {
  const meta = FIT_META[job.fit?.level ?? "weak"];
  return (
    <div className="cropmarks flex h-full flex-col rounded-sm border border-rule bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wider text-stone">{job.company || "—"}</p>
          <h3 className="mt-0.5 font-display text-lg leading-snug text-ink">{job.title}</h3>
        </div>
        <span className={`stamp shrink-0 border ${meta.cls} bg-paper text-center text-sm`}>
          {job.score}
          <span className="block text-[0.5rem] tracking-[0.15em]">{meta.label}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone">
        {job.location && <span>{job.location}</span>}
        {job.remote && <span className="rounded-sm border border-pine px-1.5 py-0.5 text-pine">Remote</span>}
        {job.country && <span className="uppercase">{countryLabel(job.country) === job.country ? job.country : countryLabel(job.country)}</span>}
        {job.postedAt && <span>· {timeAgo(job.postedAt)}</span>}
        {job.salary && <span className="text-ink">· {job.salary}</span>}
        {job.isNew && <span className="rounded-sm bg-crimson px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper">New</span>}
      </div>

      {job.fit?.reasons?.length ? (
        <ul className="mt-3 space-y-1 text-sm leading-snug text-ink/80">
          {job.fit.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex gap-2"><span className="text-crimson">—</span><span>{r}</span></li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex items-center gap-3 pt-4">
        <button
          onClick={onGenerate}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-crimson"
        >
          Tailor my resume
        </button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-stone underline-offset-4 hover:text-ink hover:underline"
        >
          View posting ↗
        </a>
      </div>
    </div>
  );
}

/* ---------------- states ---------------- */

function EmptyResume() {
  return (
    <div className="mt-8 cropmarks rounded-sm border border-dashed border-rule-dark bg-paper p-12 text-center">
      <p className="font-display text-2xl text-ink">First, add your resume</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone">
        Job Match scores real postings against your actual experience — so it needs
        your resume on file. Upload it once under your sources, then come back here.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-block rounded-md bg-crimson px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink"
      >
        Add your resume →
      </Link>
    </div>
  );
}

function IdlePrompt({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="mt-8 cropmarks rounded-sm border border-dashed border-rule-dark bg-paper p-12 text-center">
      <p className="font-display text-2xl text-ink">Ready when you are</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone">
        Set your role, country, and how recent you want the postings above, then run
        the search. Forume scores each result against your resume.
      </p>
      <button
        onClick={onSearch}
        className="mt-6 inline-block rounded-md bg-crimson px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink"
      >
        Search jobs
      </button>
    </div>
  );
}

function NoResults() {
  return (
    <div className="mt-8 rounded-sm border border-dashed border-rule-dark p-12 text-center text-stone">
      <p className="font-display text-xl text-ink">No live matches for this scope</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        Try widening the country, the date range, or the role keywords — the freshest
        postings for a niche combo can be thin.
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="h-44 animate-pulse rounded-sm border border-rule bg-paper/60" />
      ))}
    </ul>
  );
}
