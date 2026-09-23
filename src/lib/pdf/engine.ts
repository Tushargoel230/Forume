import "server-only";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

/*
 * PDF engine — Option A: a headless Chromium renders the real /print page (the
 * exact Tailwind résumé/cover templates) and prints ONE page sized to the
 * content, as vector (selectable, ATS-parseable) text — never a rasterized image.
 *
 * This module is the ONLY place that talks to a rendering backend. To swap to
 * Option B (@react-pdf/renderer) if Chromium ever proves flaky on the host,
 * replace the body of renderPdf() here — the /api/pdf route and the entire
 * client stay exactly as they are.
 *
 * Pinned, protocol-matched versions (do NOT bump one without the other):
 *   puppeteer-core          25.11.0  → targets Chromium 153.0.8010.36
 *   @sparticuz/chromium-min 153.0.0  → Chromium 153
 * In production the Chromium binary is fetched from CHROMIUM_TAR_URL — stash the
 * chromium-v153.0.0 pack (github.com/Sparticuz/chromium/releases) in Vercel Blob
 * so the export can never break when an upstream host or version drifts.
 */

function localChrome(): string {
  if (process.env.LOCAL_CHROME_PATH) return process.env.LOCAL_CHROME_PATH;
  switch (process.platform) {
    case "win32":
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    case "darwin":
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    default:
      return "/usr/bin/google-chrome";
  }
}

async function launch(): Promise<Browser> {
  // On the dev machine, drive the locally installed Chrome. On Vercel, use the
  // serverless Chromium loaded (and cached in /tmp) from the pinned Blob tar.
  if (!process.env.VERCEL) {
    return puppeteer.launch({
      executablePath: localChrome(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  const executablePath = await chromium.executablePath(process.env.CHROMIUM_TAR_URL);
  return puppeteer.launch({
    executablePath,
    args: chromium.args,
    headless: true,
  });
}

export async function renderPdf(origin: string, payload: unknown): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1400 });
    // hand the sheet data to the /print page before any of its scripts run
    await page.evaluateOnNewDocument((data) => {
      (window as unknown as { __FORUME_PDF__?: unknown }).__FORUME_PDF__ = data;
    }, payload);
    await page.goto(`${origin}/print`, { waitUntil: "domcontentloaded" });
    // /print sets this once the sheet has painted and fonts are ready
    await page.waitForFunction(
      () => document.documentElement.dataset.pdfReady === "1",
      { timeout: 20000 },
    );
    // measure the natural, full content box → one page exactly that size
    const box = await page.evaluate(() => {
      const el = document.getElementById("pdf-target");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.ceil(r.width), h: Math.ceil(el.scrollHeight) };
    });
    if (!box) throw new Error("print target not found");
    const pdf = await page.pdf({
      width: `${box.w}px`,
      height: `${box.h}px`,
      printBackground: true,
      pageRanges: "1",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
