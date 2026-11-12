import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  ContentCeremonySchema,
  ContentCitySchema,
  ContentPackageSchema,
  ContentRoutesSchema,
  ContentVenuesSchema,
} from "@managevent/validators";

function getContentRoot(): string {
  const cwd = process.cwd();
  const direct = resolve(cwd, "content");
  if (existsSync(direct)) return direct;
  return resolve(cwd, "../../content");
}

export function loadCeremonies() {
  const folder = resolve(getContentRoot(), "ceremonies");
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) =>
      ContentCeremonySchema.parse(
        JSON.parse(readFileSync(resolve(folder, file), "utf8")) as unknown,
      ),
    );
}

export function loadCeremonyBySlug(slug: string) {
  return loadCeremonies().find((c) => c.slug === slug) ?? null;
}

export function loadPerthVenues() {
  const filePath = resolve(getContentRoot(), "locations/perth/venues.json");
  return ContentVenuesSchema.parse(JSON.parse(readFileSync(filePath, "utf8")) as unknown);
}

export function loadVenueBySlug(slug: string) {
  return loadPerthVenues().find((v) => v.slug === slug) ?? null;
}

export function loadPackages() {
  const folder = resolve(getContentRoot(), "packages");
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) =>
      ContentPackageSchema.parse(
        JSON.parse(readFileSync(resolve(folder, file), "utf8")) as unknown,
      ),
    );
}

export function loadPackageBySlug(slug: string) {
  return loadPackages().find((p) => p.slug === slug) ?? null;
}

export function loadCities() {
  const folder = resolve(getContentRoot(), "locations");
  return readdirSync(folder)
    .sort()
    .map((cityDir) =>
      ContentCitySchema.parse(
        JSON.parse(readFileSync(resolve(folder, cityDir, "city.json"), "utf8")) as unknown,
      ),
    );
}

export function loadCityBySlug(slug: string) {
  return loadCities().find((c) => c.slug === slug) ?? null;
}

export function loadPerthCity() {
  const city = loadCityBySlug("perth");
  if (!city) throw new Error("Perth city configuration is missing");
  return city;
}

export function loadRoutes() {
  const filePath = resolve(getContentRoot(), "routes.json");
  return ContentRoutesSchema.parse(JSON.parse(readFileSync(filePath, "utf8")) as unknown);
}

/**
 * Resolves a `/perth/[slug]` path against direct ceremony slugs or commercial aliases in `routes.json`.
 */
export function resolvePerthCeremonyOrAlias(slug: string): {
  ceremony: ReturnType<typeof loadCeremonyBySlug>;
  canonicalPath: string;
  isAlias: boolean;
  aliasPath?: string | undefined;
  packageFilterSlugs?: string[] | undefined;
} | null {
  const direct = loadCeremonyBySlug(slug);
  if (direct) {
    return {
      ceremony: direct,
      canonicalPath: `/perth/${direct.slug}`,
      isAlias: false,
    };
  }

  const targetPath = `/perth/${slug}`;
  const alias = loadRoutes().aliases.find((a) => a.path === targetPath);
  if (!alias) return null;

  const canonicalSlug = alias.canonical.replace(/^\/perth\//, "");
  const ceremony = loadCeremonyBySlug(canonicalSlug);
  if (!ceremony) return null;

  const filterSlugs = Array.isArray(alias.packageFilter?.ceremonySlugs)
    ? (alias.packageFilter.ceremonySlugs as string[])
    : undefined;

  return {
    ceremony,
    canonicalPath: alias.canonical,
    isAlias: true,
    aliasPath: alias.path,
    packageFilterSlugs: filterSlugs,
  };
}

/**
 * Evaluates the WEBSITE.md §A7 programmatic local SEO thin-content guard for a city ceremony page.
 * Requires >= 3 local content blocks and >= 300 words of copy.
 */
export function evaluateLocalSeoGuard(slug: string): {
  passes: boolean;
  localBlockCount: number;
  wordCount: number;
} {
  const resolved = resolvePerthCeremonyOrAlias(slug);
  if (!resolved || !resolved.ceremony) {
    return { passes: false, localBlockCount: 0, wordCount: 0 };
  }
  const { ceremony } = resolved;
  const city = loadPerthCity();
  const venues = loadPerthVenues().filter((v) => v.suitableFor.includes(ceremony.slug));
  const packages = loadPackages().filter((p) => p.ceremonySlugs.includes(ceremony.slug));
  const faqs = ceremony.faq ?? [];

  let localBlockCount = 0;
  if (venues.length > 0) localBlockCount += 1; // Block 1: Local Perth venues
  if (packages.length > 0 || ceremony.includes.length > 0) localBlockCount += 1; // Block 2: Packages & local price note
  if (faqs.length > 0) localBlockCount += 1; // Block 3: Local FAQ
  if (city.areasServed.length > 0) localBlockCount += 1; // Block 4: Local Perth areas served

  const textParts: string[] = [
    `${ceremony.name.en} in ${city.name.en}, Western Australia`,
    ceremony.summary.en,
    city.localIntro?.en ?? "",
    ceremony.culturalNotes?.en ?? "",
    `Managevent plans, styles, hires and coordinates ${ceremony.name.en.toLowerCase()} across metropolitan Perth, including ${city.areasServed.join(", ")}.`,
    "Every Perth ceremony package is quoted in Australian dollars (AUD) inclusive of 10% GST under Australian Consumer Law, with our live RSVP-to-catering logistics bridge sizing tables, dietary meals, RSA bar staffing and equipment hire automatically.",
    ...ceremony.includes.map(
      (inc) => `Full-service Perth ${inc.replace(/-/g, " ")} coordination and local delivery.`,
    ),
    ...(ceremony.timelineTemplate ?? []).map((t) => t.label.en),
    ...venues.map((v) => `${v.name.en} (${v.area}) ${v.notes?.en ?? ""}`),
    ...packages.flatMap((p) => [p.name.en, ...p.inclusions.map((i) => i.label.en)]),
    ...faqs.flatMap((f) => [f.q.en, f.a.en]),
  ];

  const words = textParts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const wordCount = words.length;
  return {
    passes: localBlockCount >= 3 && wordCount >= 300,
    localBlockCount,
    wordCount,
  };
}
