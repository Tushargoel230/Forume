import type { MetadataRoute } from "next";

const BASE = "https://forume-jaxx24.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signin", "/privacy", "/terms", "/imprint"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }));
}
