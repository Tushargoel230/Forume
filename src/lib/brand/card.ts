/* Renders the daily Instagram assets as PNG buffers, fully server-side (works on
   Vercel — the Anton font is bundled as base64, no system fonts needed).
   - renderPostCard: 1080×1350 (4:5 feed post)
   - renderStoryCard: 1080×1920 (9:16 story)
   Both take a short "hook" line (from the content queue) and stamp it on-brand:
   coal background, crimson accent, Forume F-mark + @handle. */

import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ANTON_TTF_BASE64 } from "./fonts";

// Materialize the bundled font to a temp file once (writable on Vercel /tmp) and
// point resvg at it via the documented `fontFiles` API — reliable and fully typed.
const FONT_PATH = join(tmpdir(), "forume-anton.ttf");
function fontPath(): string {
  if (!existsSync(FONT_PATH)) writeFileSync(FONT_PATH, Buffer.from(ANTON_TTF_BASE64, "base64"));
  return FONT_PATH;
}

const CRIMSON = "#C5283D";
const COAL = "#0E0F11";
const LINEN = "#F6F4EF";
const FOG = "#8A9096";

const xmlEscape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Greedy word-wrap to at most `maxChars` per line. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The crimson F-stamp mark (echoes src/app/icon.svg), positioned at (x,y). */
function fMark(x: number, y: number, size: number): string {
  const s = size;
  return `
    <g transform="translate(${x} ${y}) rotate(-6 ${s / 2} ${s / 2})">
      <rect x="${s * 0.09}" y="${s * 0.09}" width="${s * 0.82}" height="${s * 0.82}" rx="${s * 0.14}"
            fill="none" stroke="${CRIMSON}" stroke-width="${s * 0.09}"/>
      <text x="${s * 0.5}" y="${s * 0.74}" font-family="Anton" font-size="${s * 0.66}"
            fill="${CRIMSON}" text-anchor="middle">F</text>
    </g>`;
}

type CardOpts = { hook: string; width: number; height: number; story: boolean };

function buildSvg({ hook, width, height, story }: CardOpts): string {
  const margin = Math.round(width * 0.09);
  const usableW = width - margin * 2;

  // Headline: uppercase for the poster look, wrapped, then sized to fit width & area.
  const HOOK = xmlEscapeSafeUpper(hook);
  const lines = wrap(HOOK, 14);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  // Anton is condensed (~0.42em avg advance). Fit by width and by the headline band.
  const bandH = height * (story ? 0.34 : 0.42);
  const fsByWidth = usableW / (longest * 0.42);
  const fsByHeight = bandH / (lines.length * 1.06);
  const fs = Math.max(44, Math.min(fsByWidth, fsByHeight, width * 0.17));
  const lineH = fs * 1.06;

  const blockH = lines.length * lineH;
  const focalY = height * (story ? 0.44 : 0.5); // vertical center of the headline block
  const firstBaseline = focalY - blockH / 2 + fs * 0.82;

  const headline = lines
    .map((l, i) => `<text x="${width / 2}" y="${Math.round(firstBaseline + i * lineH)}"
        font-family="Anton" font-size="${Math.round(fs)}" fill="${LINEN}"
        text-anchor="middle" letter-spacing="1">${l}</text>`)
    .join("\n");

  // Crimson accent rule just under the headline.
  const ruleY = Math.round(focalY + blockH / 2 + fs * 0.35);
  const rule = `<rect x="${width / 2 - width * 0.09}" y="${ruleY}" width="${width * 0.18}" height="${Math.max(6, width * 0.012)}" rx="3" fill="${CRIMSON}"/>`;

  // Top brand lockup: F-mark + FORUME wordmark.
  const markSize = Math.round(width * 0.085);
  const brand = `
    ${fMark(margin, margin, markSize)}
    <text x="${margin + markSize * 1.12}" y="${margin + markSize * 0.68}"
      font-family="Anton" font-size="${Math.round(width * 0.038)}" fill="${LINEN}"
      letter-spacing="4">FORUME</text>`;

  // Bottom: handle, plus a CTA on the story.
  const handleY = height - margin;
  const handle = `<text x="${width / 2}" y="${handleY}" font-family="Anton"
      font-size="${Math.round(width * 0.03)}" fill="${FOG}" text-anchor="middle"
      letter-spacing="3">@FORUME.AI</text>`;

  const cta = story
    ? `<g>
        <rect x="${width / 2 - width * 0.34}" y="${height - margin - width * 0.2}" width="${width * 0.68}" height="${width * 0.13}" rx="${width * 0.065}" fill="${CRIMSON}"/>
        <text x="${width / 2}" y="${height - margin - width * 0.2 + width * 0.088}" font-family="Anton"
          font-size="${Math.round(width * 0.05)}" fill="${LINEN}" text-anchor="middle" letter-spacing="2">LINK IN BIO</text>
       </g>`
    : "";

  // Subtle crimson corner accent (rotated block, low opacity) for depth.
  const accent = `<rect x="${width * 0.62}" y="${-width * 0.12}" width="${width * 0.6}" height="${width * 0.3}"
      transform="rotate(-18 ${width} 0)" fill="${CRIMSON}" opacity="0.14"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${COAL}"/>
    ${accent}
    ${brand}
    ${headline}
    ${rule}
    ${cta}
    ${handle}
  </svg>`;
}

// Uppercase then XML-escape (order matters so escaped entities aren't uppercased).
function xmlEscapeSafeUpper(s: string): string {
  return xmlEscape(s.toUpperCase());
}

function render(opts: CardOpts): Buffer {
  const svg = buildSvg(opts);
  const resvg = new Resvg(svg, {
    font: { fontFiles: [fontPath()], defaultFontFamily: "Anton", loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}

export function renderPostCard(hook: string): Buffer {
  return render({ hook, width: 1080, height: 1350, story: false });
}

export function renderStoryCard(hook: string): Buffer {
  return render({ hook, width: 1080, height: 1920, story: true });
}
