import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  return ["", "/privacy", "/terms", "/accessibility"].flatMap((path) =>
    ["", "/fa"].map((prefix) => ({
      url: `${siteUrl}${prefix}${path}`,
      alternates: { languages: { "en-AU": `${siteUrl}${path}`, "fa-IR": `${siteUrl}/fa${path}` } },
    })),
  );
}
