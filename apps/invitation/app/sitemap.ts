import type { MetadataRoute } from "next";
import { absoluteUrl, routes } from "@/lib/urls";

// Owner: PUBLIC. The two indexable pages only. `/pricing` is noindex (header, meta tag and
// robots.txt), so it is not listed. Sample invitations are `/i/*` pages and are
// never listed.

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  return [routes.home, routes.templates].map((path) => ({ url: absoluteUrl(path) }));
}
