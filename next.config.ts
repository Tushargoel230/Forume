import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native .node binary that can't be bundled into an
  // ESM chunk — keep it external so Next requires it at runtime (used by the
  // daily Instagram-asset renderer in src/lib/brand/card.ts).
  // Native/dynamic-require packages that must not be bundled into server chunks.
  // @resvg/resvg-js: daily IG-asset renderer. puppeteer-core + @sparticuz/chromium:
  // the PDF export engine (src/lib/pdf/engine.ts) — Chromium runs from the package's
  // bundled bin/, so it must stay external (not relocated by the bundler).
  serverExternalPackages: ["@resvg/resvg-js", "puppeteer-core", "@sparticuz/chromium"],
  // Force Next output file tracing to ship @sparticuz/chromium's bin/ (the brotli
  // Chromium binary) with the /api/pdf function — otherwise executablePath() finds
  // no local binary at runtime. Key is the route path (picomatch), per Next docs.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
