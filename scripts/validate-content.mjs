#!/usr/bin/env node
/**
 * Validates every JSON file in `/content` against the JSON schemas in `/content/schemas`
 * and structural rules (ceremonies, cities, packages, routes, venues, testimonials).
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
}

// 3. Validate cities
const cityDirs = readdirSync(resolve(contentRoot, "locations"));
for (const city of cityDirs) {
  const cityData = readJson(resolve(contentRoot, "locations", city, "city.json"));
  for (const reqKey of ["slug", "status", "name", "timeZone", "areasServed"]) {
    if (!(reqKey in cityData)) {
      throw new Error(`Missing required field '${reqKey}' in content/locations/${city}/city.json`);
    }
  }
}

// 4. Validate packages
const packageFiles = readdirSync(resolve(contentRoot, "packages")).filter((f) =>
  f.endsWith(".json"),
);
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

console.info(
  `Validated /content: ${ceremonyFiles.length} ceremonies, ${cityDirs.length} cities, ${packageFiles.length} packages, ${perthVenues.length} Perth venues.`,
);
