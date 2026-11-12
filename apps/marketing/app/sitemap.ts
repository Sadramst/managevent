import type { MetadataRoute } from "next";
import {
  evaluateLocalSeoGuard,
  loadCeremonies,
  loadPackages,
  loadPerthVenues,
  loadRoutes,
} from "../lib/content";
import { siteUrl } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];

  const staticPaths = [
    "",
    "/ceremonies",
    "/packages",
    "/venues",
    "/services",
    "/invitations",
    "/memorials",
    "/faq",
    "/how-it-works",
    "/pricing",
    "/about",
    "/contact",
    "/perth",
    "/privacy",
    "/terms",
    "/accessibility",
  ];

  const ceremonyPaths = loadCeremonies().map((c) => `/ceremonies/${c.slug}`);
  const packagePaths = loadPackages().map((p) => `/packages/${p.slug}`);
  const venuePaths = loadPerthVenues().map((v) => `/venues/${v.slug}`);

  // Programmatic local SEO routes for Perth (live city) that pass the thin-content guard
  const perthCeremonyPaths = loadCeremonies()
    .filter((c) => evaluateLocalSeoGuard(c.slug).passes)
    .map((c) => `/perth/${c.slug}`);

  const perthAliasPaths = loadRoutes()
    .aliases.filter((a) => evaluateLocalSeoGuard(a.path.replace(/^\/perth\//, "")).passes)
    .map((a) => a.path);

  const allPaths = Array.from(
    new Set([
      ...staticPaths,
      ...ceremonyPaths,
      ...packagePaths,
      ...venuePaths,
      ...perthCeremonyPaths,
      ...perthAliasPaths,
    ]),
  );

  return allPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" || path === "/perth" ? "weekly" : "monthly",
    priority:
      path === "" ? 1.0 : path.startsWith("/perth") || path.startsWith("/ceremonies") ? 0.9 : 0.8,
  }));
}
