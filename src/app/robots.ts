import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/app"] },
    sitemap: "https://forume-jaxx24.vercel.app/sitemap.xml",
  };
}
