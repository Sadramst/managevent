import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  return ["", "/privacy", "/terms", "/accessibility"].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}
