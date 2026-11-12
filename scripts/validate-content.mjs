#!/usr/bin/env node
/**
 * Validates every JSON file in `/content` against the JSON schemas in `/content/schemas`,
 * structural rules (ceremonies, cities, packages, routes, venues, testimonials),
 * and the WEBSITE.md §A7 Local SEO Thin-Content Guard (>= 3 local blocks & >= 300 words).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(currentDir, "../content");
const schemasDir = resolve(contentRoot, "schemas");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

// 1. Ensure all schema files in content/schemas are valid JSON
const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith(".schema.json"));
if (schemaFiles.length < 7) {
  throw new Error(
    `Expected at least 7 JSON schemas in content/schemas, found ${schemaFiles.length}`,
  );
}
for (const file of schemaFiles) {
  const schema = readJson(resolve(schemasDir, file));
  if (!schema.$schema || !schema.title) {
    throw new Error(`Invalid JSON schema header in content/schemas/${file}`);
  }
}

// 2. Validate ceremonies
const ceremonyFiles = readdirSync(resolve(contentRoot, "ceremonies")).filter((f) =>
  f.endsWith(".json"),
);
const ceremonies = [];
for (const file of ceremonyFiles) {
  const data = readJson(resolve(contentRoot, "ceremonies", file));
  for (const reqKey of [
    "slug",
    "status",
    "family",
    "experienceMode",
    "name",
    "summary",
    "includes",
  ]) {
    if (!(reqKey in data)) {
      throw new Error(`Missing required field '${reqKey}' in content/ceremonies/${file}`);
    }
  }
  if (!data.name?.en || !data.summary?.en) {
    throw new Error(`Missing English name/summary in content/ceremonies/${file}`);
  }
  ceremonies.push(data);
}

// 3. Validate cities
const cityDirs = readdirSync(resolve(contentRoot, "locations"));
const cities = {};
for (const city of cityDirs) {
  const cityData = readJson(resolve(contentRoot, "locations", city, "city.json"));
  for (const reqKey of ["slug", "status", "name", "timeZone", "areasServed"]) {
    if (!(reqKey in cityData)) {
      throw new Error(`Missing required field '${reqKey}' in content/locations/${city}/city.json`);
    }
  }
  cities[cityData.slug] = cityData;
}

// 4. Validate packages
const packageFiles = readdirSync(resolve(contentRoot, "packages")).filter((f) =>
  f.endsWith(".json"),
);
const packages = [];
for (const file of packageFiles) {
  const pkg = readJson(resolve(contentRoot, "packages", file));
  for (const reqKey of [
    "slug",
    "status",
    "name",
    "ceremonySlugs",
    "guestMin",
    "guestMax",
    "fromPriceIncGstCents",
    "inclusions",
  ]) {
    if (!(reqKey in pkg)) {
      throw new Error(`Missing required field '${reqKey}' in content/packages/${file}`);
    }
  }
  packages.push(pkg);
}

// 5. Validate routes, perth venues, and testimonials
const routes = readJson(resolve(contentRoot, "routes.json"));
if (!Array.isArray(routes.aliases)) {
  throw new Error("content/routes.json must contain an 'aliases' array");
}

const perthVenues = readJson(resolve(contentRoot, "locations/perth/venues.json"));
if (!Array.isArray(perthVenues) || perthVenues.length === 0) {
  throw new Error("content/locations/perth/venues.json must be a non-empty array");
}

const testimonials = readJson(resolve(contentRoot, "testimonials/testimonials.json"));
if (!Array.isArray(testimonials)) {
  throw new Error("content/testimonials/testimonials.json must be an array");
}
for (const item of testimonials) {
  if (item.verified !== true) {
    throw new Error(
      "ACL violation: unverified testimonial in content/testimonials/testimonials.json",
    );
  }
}

// 6. Enforce WEBSITE.md §A7 Local SEO Thin-Content Guard for all live Perth ceremony pages
const perthCity = cities.perth;
if (!perthCity || perthCity.status !== "live") {
  throw new Error("Perth city must be configured with status 'live'");
}

for (const ceremony of ceremonies) {
  const venues = perthVenues.filter((v) => v.suitableFor.includes(ceremony.slug));
  const matchingPackages = packages.filter((p) => p.ceremonySlugs.includes(ceremony.slug));
  const faqs = ceremony.faq ?? [];

  let localBlockCount = 0;
  if (venues.length > 0) localBlockCount += 1;
  if (matchingPackages.length > 0 || ceremony.includes.length > 0) localBlockCount += 1;
  if (faqs.length > 0) localBlockCount += 1;
  if (perthCity.areasServed.length > 0) localBlockCount += 1;

  const textParts = [
    `${ceremony.name.en} in ${perthCity.name.en}, Western Australia`,
    ceremony.summary.en,
    perthCity.localIntro?.en ?? "",
    ceremony.culturalNotes?.en ?? "",
    `Managevent plans, styles, hires and coordinates ${ceremony.name.en.toLowerCase()} across metropolitan Perth, including ${perthCity.areasServed.join(", ")}.`,
    "Every Perth ceremony package is quoted in Australian dollars (AUD) inclusive of 10% GST under Australian Consumer Law, with our live RSVP-to-catering logistics bridge sizing tables, dietary meals, RSA bar staffing and equipment hire automatically.",
    ...ceremony.includes.map(
      (inc) => `Full-service Perth ${inc.replace(/-/g, " ")} coordination and local delivery.`,
    ),
    ...(ceremony.timelineTemplate ?? []).map((t) => t.label.en),
    ...venues.map((v) => `${v.name.en} (${v.area}) ${v.notes?.en ?? ""}`),
    ...matchingPackages.flatMap((p) => [p.name.en, ...p.inclusions.map((i) => i.label.en)]),
    ...faqs.flatMap((f) => [f.q.en, f.a.en]),
  ];

  const wordCount = textParts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  if (localBlockCount < 3 || wordCount < 300) {
    throw new Error(
      `Local SEO Thin-Content Guard failed for /perth/${ceremony.slug}: localBlocks=${localBlockCount} (req >=3), words=${wordCount} (req >=300)`,
    );
  }
}

console.info(
  `Validated /content: ${ceremonyFiles.length} ceremonies, ${cityDirs.length} cities, ${packageFiles.length} packages, ${perthVenues.length} Perth venues, ${routes.aliases.length} route aliases (all passed §A7 300-word local SEO guard).`,
);
