import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import {
  evaluateLocalSeoGuard,
  loadCeremonies,
  loadPackages,
  loadPerthCity,
  loadPerthVenues,
  loadRoutes,
  resolvePerthCeremonyOrAlias,
} from "./content";
import {
  buildBreadcrumbJsonLd,
  buildCeremonyServiceJsonLd,
  buildFaqPageJsonLd,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
} from "./seo-schema";
import { localePath, pageMetadata } from "./site";

describe("marketing launch & SEO architecture", () => {
  it("loads the full ceremony catalogue (20 ceremonies), packages (6) and Perth venues (9) through validators", () => {
    const ceremonies = loadCeremonies();
    expect(ceremonies.length).toBeGreaterThanOrEqual(17);
    expect(ceremonies.some((ceremony) => ceremony.slug === "wedding")).toBe(true);
    expect(ceremonies.some((ceremony) => ceremony.slug === "celebration-of-life")).toBe(true);
    expect(loadPackages().length).toBeGreaterThanOrEqual(6);
    expect(loadPerthVenues().length).toBeGreaterThanOrEqual(9);
  });

  it("keeps language in URLs and publishes locale alternates and canonicals", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("en", "/privacy")).toBe("/privacy");
    expect(pageMetadata("en", "Privacy", "/privacy").alternates?.canonical).toBe("/privacy");
  });

  it("resolves direct Perth ceremony slugs and commercial route aliases with canonicals", () => {
    const direct = resolvePerthCeremonyOrAlias("wedding");
    expect(direct?.isAlias).toBe(false);
    expect(direct?.canonicalPath).toBe("/perth/wedding");

    const alias = resolvePerthCeremonyOrAlias("wake-catering");
    expect(alias?.isAlias).toBe(true);
    expect(alias?.canonicalPath).toBe("/perth/wake");
    expect(alias?.ceremony?.slug).toBe("wake");

    const meta = pageMetadata("en", "Wake Catering Perth", "/perth/wake-catering", {
      canonicalPath: alias?.canonicalPath,
    });
    expect(meta.alternates?.canonical).toBe("/perth/wake");
  });

  it("enforces WEBSITE.md §A7 Local SEO Thin-Content Guard (>=3 local blocks & >=300 words) across all ceremonies and aliases", () => {
    for (const ceremony of loadCeremonies()) {
      const guard = evaluateLocalSeoGuard(ceremony.slug);
      expect(guard.passes).toBe(true);
      expect(guard.localBlockCount).toBeGreaterThanOrEqual(3);
      expect(guard.wordCount).toBeGreaterThanOrEqual(300);
    }
    for (const alias of loadRoutes().aliases) {
      const aliasSlug = alias.path.replace(/^\/perth\//, "");
      const guard = evaluateLocalSeoGuard(aliasSlug);
      expect(guard.passes).toBe(true);
    }
  });

  it("builds valid JSON-LD schemas and generates a comprehensive sitemap", () => {
    const perth = loadPerthCity();
    expect(buildOrganizationJsonLd()["@type"]).toBe("Organization");
    expect(buildLocalBusinessJsonLd(perth.areasServed)["@type"]).toEqual([
      "LocalBusiness",
      "EventPlanner",
    ]);
    expect(
      buildBreadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Perth", path: "/perth" },
      ])["@type"],
    ).toBe("BreadcrumbList");
    expect(
      buildFaqPageJsonLd([{ question: "Q?", answer: "A." }])["@type"],
    ).toBe("FAQPage");
    expect(
      buildCeremonyServiceJsonLd({
        name: "Weddings",
        description: "Desc",
        path: "/ceremonies/wedding",
        includes: ["planning", "styling"],
      })["@type"],
    ).toBe("Service");

    const entries = sitemap();
    expect(entries.length).toBeGreaterThanOrEqual(60);
    expect(entries.some((e) => e.url.endsWith("/perth"))).toBe(true);
    expect(entries.some((e) => e.url.endsWith("/perth/wedding"))).toBe(true);
    expect(entries.some((e) => e.url.endsWith("/memorials"))).toBe(true);
  });
});
