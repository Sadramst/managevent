import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/urls";

// Owner: PUBLIC. Extend only if a public route is added.

/**
 * Only `/` and `/templates` are for search engines. Everything else is private or
 * transactional and also carries `noindex` as a header and a meta tag.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/templates"],
      disallow: [
        "/i/",
        "/studio",
        "/check-in/",
        "/sign-in",
        "/sign-up",
        "/reset-password",
        "/unsubscribe",
        "/pricing",
        "/legacy/",
        "/anniversary/",
        "/e/",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
