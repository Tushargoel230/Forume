import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native .node binary that can't be bundled into an
  // ESM chunk — keep it external so Next requires it at runtime (used by the
  // daily Instagram-asset renderer in src/lib/brand/card.ts).
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
