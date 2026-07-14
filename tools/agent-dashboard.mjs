/* Forume — local agent-ops dashboard.
   Run: node tools/agent-dashboard.mjs  →  http://localhost:8317
   Zero dependencies (Node 18+). Reads .env.local for the optional
   SUPABASE_SERVICE_ROLE_KEY; without it the Supabase panels show a setup hint
   instead of data. Nothing here is served beyond localhost. */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = 8317;
const APP_URL = "https://forume-six.vercel.app";
const REPO = "Tushargoel230/Forume";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function envLocal() {
  const out = {};
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}

async function j(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function siteHealth() {
  const pages = ["/", "/app"];
  const checks = await Promise.all(
    pages.map(async (p) => {
      try {
        const r = await fetch(APP_URL + p, { redirect: "manual" });
        return { name: p, ok: r.status === 200, detail: `HTTP ${r.status}` };
      } catch (e) {
        return { name: p, ok: false, detail: String(e.message ?? e) };
      }
    })
  );
  // A locked dispatcher answers 401 to a bad secret; anything else is a problem.
  try {
    const r = await fetch(APP_URL + "/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-agent-secret": "probe" },
      body: JSON.stringify({ agent: "ops-digest" }),
    });
    checks.push({
      name: "/api/agents/run (auth gate)",
      ok: r.status === 401,
      detail: r.status === 401 ? "deployed, locked (401)" : `unexpected HTTP ${r.status}`,
    });
  } catch (e) {
    checks.push({ name: "/api/agents/run (auth gate)", ok: false, detail: String(e.message ?? e) });
  }
  return checks;
}

async function actionRuns() {
  const d = await j(`https://api.github.com/repos/${REPO}/actions/runs?per_page=30`, {
    headers: { accept: "application/vnd.github+json" },
  });
  return (d.workflow_runs ?? [])
    .filter((r) => r.name === "Ops agents")
    .slice(0, 10)
    .map((r) => ({
      when: r.created_at,
      event: r.event,
      conclusion: r.conclusion ?? r.status,
      url: r.html_url,
    }));
}

async function openPRs() {
  const d = await j(`https://api.github.com/repos/${REPO}/pulls?state=open&per_page=20`, {
    headers: { accept: "application/vnd.github+json" },
  });
  return d.map((p) => ({ n: p.number, title: p.title, user: p.user?.login, url: p.html_url }));
}

async function supabasePanels(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { configured: false };
  const h = { apikey: key, authorization: `Bearer ${key}` };
  const get = (path) => j(`${url}/rest/v1/${path}`, { headers: h });
  const count = async (table, filter = "") => {
    const r = await fetch(`${url}/rest/v1/${table}?select=id${filter}&limit=1`, {
      headers: { ...h, prefer: "count=exact" },
    });
    return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
  };
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [runs, genWeek, fbNew, cqPending] = await Promise.all([
    get("agent_runs?select=agent,status,started_at,summary&order=started_at.desc&limit=12"),
    count("generation_events", `&created_at=gte.${weekAgo}`),
    count("feedback", "&status=eq.new"),
    count("content_queue", "&status=eq.pending"),
  ]);
  return { configured: true, runs, genWeek, fbNew, cqPending };
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dot = (ok) => `<span class="dot ${ok ? "ok" : "bad"}"></span>`;

function render(data) {
  const { health, runs, prs, sb, env, errors } = data;
  const scheduleOk = runs.length > 0 && runs[0].conclusion === "success";
  const agentsAlive = sb.configured && (sb.runs?.length ?? 0) > 0;

  const checklist = [
    ["GitHub Actions cron firing", runs.length > 0, runs.length ? "workflow is scheduled and triggering" : "no runs yet"],
    ["Cron triggers succeed (repo secrets FORUME_APP_URL + AGENT_CRON_SECRET)", scheduleOk, scheduleOk ? "last scheduled run succeeded" : "last run failed — add both secrets in GitHub → Settings → Secrets → Actions"],
    ["SUPABASE_SERVICE_ROLE_KEY in local .env.local", Boolean(env.SUPABASE_SERVICE_ROLE_KEY), env.SUPABASE_SERVICE_ROLE_KEY ? "dashboard can read agent tables" : "add it to .env.local so this dashboard can show agent activity"],
    ["Agents have produced runs", agentsAlive, agentsAlive ? "agent_runs has entries" : "agent_runs is empty — agents have never executed"],
  ];

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="120">
<title>Forume · agent ops</title>
<style>
  :root { --paper:#fffefb; --linen:#f6f4ef; --ink:#1f2124; --stone:#6a6d71; --rule:#e5e1d6; --crimson:#c5283d; --okc:#2e7d32; }
  @media (prefers-color-scheme: dark) { :root { --paper:#17191d; --linen:#101113; --ink:#ece9e2; --stone:#a7a49b; --rule:#2b2e35; --okc:#7bc47f; } }
  * { box-sizing:border-box; margin:0 }
  body { background:var(--linen); color:var(--ink); font:14px/1.5 "Public Sans",system-ui,sans-serif; padding:28px; }
  h1 { font:600 22px Georgia,serif; margin-bottom:2px }
  .sub { color:var(--stone); margin-bottom:24px; font-size:12px; letter-spacing:.08em; text-transform:uppercase }
  .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); max-width:1200px }
  .card { background:var(--paper); border:1px solid var(--rule); padding:18px 20px; }
  .card h2 { font-size:11px; letter-spacing:.22em; text-transform:uppercase; border-bottom:1px solid var(--rule); padding-bottom:6px; margin-bottom:12px; color:var(--crimson) }
  table { width:100%; border-collapse:collapse; font-size:13px }
  td { padding:4px 6px 4px 0; vertical-align:top; border-bottom:1px dashed var(--rule) }
  tr:last-child td { border-bottom:none }
  .dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:8px }
  .dot.ok { background:var(--okc) } .dot.bad { background:var(--crimson) }
  .muted { color:var(--stone) } .num { font:600 26px Georgia,serif }
  .stats { display:flex; gap:28px } .stats div { text-align:left }
  a { color:inherit } .warn { color:var(--crimson); font-weight:600 }
  .err { color:var(--crimson); font-size:12px; margin-top:12px }
</style></head><body>
<h1>Forume — agent operations</h1>
<div class="sub">local dashboard · refreshes every 2 min · generated ${new Date().toLocaleString()}</div>
<div class="grid">

<div class="card"><h2>Production health</h2><table>
${health.map((c) => `<tr><td>${dot(c.ok)}${esc(c.name)}</td><td class="muted">${esc(c.detail)}</td></tr>`).join("")}
</table></div>

<div class="card"><h2>Go-live checklist</h2><table>
${checklist.map(([n, ok, d]) => `<tr><td>${dot(ok)}${esc(n)}</td><td class="muted">${esc(d)}</td></tr>`).join("")}
</table></div>

<div class="card"><h2>Scheduled agent triggers (GitHub Actions)</h2>
${runs.length ? `<table>${runs.map((r) => `<tr><td>${dot(r.conclusion === "success")}<a href="${esc(r.url)}">${esc(r.when.replace("T", " ").slice(0, 16))}</a></td><td>${esc(r.event)}</td><td class="${r.conclusion === "success" ? "muted" : "warn"}">${esc(r.conclusion)}</td></tr>`).join("")}</table>` : `<p class="muted">No "Ops agents" workflow runs yet.</p>`}
</div>

<div class="card"><h2>Agent runs (Supabase audit log)</h2>
${!sb.configured
    ? `<p class="muted">Add <b>SUPABASE_SERVICE_ROLE_KEY</b> to .env.local to see agent activity here.</p>`
    : sb.runs.length
      ? `<table>${sb.runs.map((r) => `<tr><td>${dot(r.status === "ok")}${esc(r.agent)}</td><td class="muted">${esc((r.started_at ?? "").replace("T", " ").slice(0, 16))}</td><td class="muted">${esc((r.summary ?? "").slice(0, 90))}</td></tr>`).join("")}</table>`
      : `<p class="warn">agent_runs is empty — no agent has ever executed.</p>`}
</div>

<div class="card"><h2>Last 7 days</h2>
${sb.configured
    ? `<div class="stats"><div><div class="num">${sb.genWeek}</div><div class="muted">generations logged</div></div>
       <div><div class="num">${sb.fbNew}</div><div class="muted">new feedback</div></div>
       <div><div class="num">${sb.cqPending}</div><div class="muted">content drafts pending</div></div></div>`
    : `<p class="muted">Needs the service key (see checklist).</p>`}
</div>

<div class="card"><h2>Open pull requests (Dependabot / security)</h2>
${prs.length ? `<table>${prs.map((p) => `<tr><td><a href="${esc(p.url)}">#${p.n}</a></td><td>${esc(p.title.split("\n")[0].slice(0, 70))}</td><td class="muted">${esc(p.user)}</td></tr>`).join("")}</table>` : `<p class="muted">None open.</p>`}
</div>

</div>
${errors.length ? `<p class="err">Panel errors: ${errors.map(esc).join(" · ")}</p>` : ""}
</body></html>`;
}

const server = createServer(async (req, res) => {
  if (req.url !== "/") { res.writeHead(404); res.end(); return; }
  const env = envLocal();
  const errors = [];
  const safe = (p, fallback) => p.catch((e) => { errors.push(String(e.message ?? e)); return fallback; });
  const [health, runs, prs, sb] = await Promise.all([
    safe(siteHealth(), []),
    safe(actionRuns(), []),
    safe(openPRs(), []),
    safe(supabasePanels(env), { configured: false }),
  ]);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(render({ health, runs, prs, sb, env, errors }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Forume agent dashboard → http://localhost:${PORT}`);
});
