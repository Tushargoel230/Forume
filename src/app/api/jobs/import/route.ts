import { NextResponse } from "next/server";

export const maxDuration = 60;

/** Paste-a-job-link import: fetches a job posting URL through Jina Reader
    (r.jina.ai), which strips ads/nav/markup and returns clean text ready for the
    generate pipeline. Server-only so any Jina key stays off the client. Works
    well on real job/content pages; login-gated pages (some LinkedIn) can be thin,
    so the UI falls back to manual paste on a weak/empty result. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const raw = typeof body.url === "string" ? body.url.trim() : "";

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid link." }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) links are supported." }, { status: 400 });
  }

  const key = process.env.JINA_API_KEY?.trim();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`https://r.jina.ai/${target.toString()}`, {
      signal: ctrl.signal,
      headers: {
        "X-Return-Format": "text",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Couldn't read that page — paste the description below instead." },
        { status: 502 },
      );
    }
    const text = (await res.text()).trim().slice(0, 12000);
    // Too little text usually means a login wall or blocked page.
    if (text.length < 200) {
      return NextResponse.json(
        { error: "That page didn't return enough text (it may require a login) — paste it below instead." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Import timed out — paste the description below instead." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }
}
