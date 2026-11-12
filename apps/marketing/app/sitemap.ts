import type { MetadataRoute } from "next";
import { loadCeremonies } from "../lib/content";
import { absoluteUrl, routes, sitemapPaths } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const ceremonyPaths = loadCeremonies()
    .map((ceremony) => `${routes.ceremonies}/${ceremony.slug}`)
    .sort();
  return [...sitemapPaths, ...ceremonyPaths].map((path) => ({ url: absoluteUrl(path) }));
}
