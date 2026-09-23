import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native .node binary that can't be bundled into an
  // ESM chunk — keep it external so Next requires it at runtime (used by the
  // daily Instagram-asset renderer in src/lib/brand/card.ts).
  // Native/dynamic-require packages that must not be bundled into server chunks.
  // @resvg/resvg-js: daily IG-asset renderer. puppeteer-core + @sparticuz/chromium-min:
  // the PDF export engine (src/lib/pdf/engine.ts) — Chromium is loaded at runtime.
  serverExternalPackages: ["@resvg/resvg-js", "puppeteer-core", "@sparticuz/chromium-min"],
};

export default nextConfig;
