import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, type CeremonyFamily, type ExperienceMode, PrismaClient } from "@prisma/client";
import { generateId } from "./ids.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../../");

interface ContentCeremonyJson {
  slug: string;
  family: CeremonyFamily;
  experienceMode: ExperienceMode;
  name: Prisma.InputJsonValue;
  summary?: Prisma.InputJsonValue;
  culturalNotes?: Prisma.InputJsonValue;
  includes: string[];
  timelineTemplate?: Prisma.InputJsonValue;
}

interface ContentVenueJson {
  slug: string;
  partnerStatus: string;
  name: Prisma.InputJsonValue;
  area: string;
  type: string;
  capacity?: Prisma.InputJsonValue;
  rules?: Prisma.InputJsonValue;
  accessible?: boolean;
  geo?: { lat?: number; lng?: number };
  suitableFor: string[];
}

interface ContentPackageJson {
  slug: string;
  tier?: string;
  name: Prisma.InputJsonValue;
  ceremonySlugs: string[];
  guestMin: number;
  guestMax: number;
  fromPriceIncGstCents: number;
  inclusions: Prisma.InputJsonValue;
  addOns?: Prisma.InputJsonValue;
  depositRule?: Prisma.InputJsonValue;
}

/**
 * Loads Perth placeholder catalogue content from `/content` without touching the database.
 * Useful for both seeding and unit tests.
 */
export function loadContentSeedFixtures(contentDir: string = resolve(repoRoot, "content")) {
  const ceremoniesDir = resolve(contentDir, "ceremonies");
  const packagesDir = resolve(contentDir, "packages");
  const perthVenuesPath = resolve(contentDir, "locations/perth/venues.json");

  const ceremonyFiles = readdirSync(ceremoniesDir).filter((f) => f.endsWith(".json"));
  const ceremonies: ContentCeremonyJson[] = ceremonyFiles.map(
    (file) => JSON.parse(readFileSync(resolve(ceremoniesDir, file), "utf8")) as ContentCeremonyJson,
  );

  const packageFiles = readdirSync(packagesDir).filter((f) => f.endsWith(".json"));
  const packages: ContentPackageJson[] = packageFiles.map(
    (file) => JSON.parse(readFileSync(resolve(packagesDir, file), "utf8")) as ContentPackageJson,
  );

  const venues: ContentVenueJson[] = JSON.parse(
    readFileSync(perthVenuesPath, "utf8"),
  ) as ContentVenueJson[];

  return { ceremonies, packages, venues };
}

/**
 * Seeds the database with Perth placeholder catalogue data from `/content` plus the initial
 * reproducible `PriceList` (`2026.10.1`) and `TaxInvoiceSequence`.
 *
 * Contains NO real personal information (APPs compliance).
 */
export async function seedDatabase(prisma: PrismaClient = new PrismaClient()): Promise<{
  ceremoniesCount: number;
  venuesCount: number;
  packagesCount: number;
  priceListVersion: string;
}> {
  const { ceremonies, packages, venues } = loadContentSeedFixtures();

  for (const ceremony of ceremonies) {
    await prisma.ceremonyType.upsert({
      where: { slug: ceremony.slug },
      update: {
        family: ceremony.family,
        experienceMode: ceremony.experienceMode,
        name: ceremony.name,
        summary: ceremony.summary ?? Prisma.JsonNull,
        culturalNotes: ceremony.culturalNotes ?? Prisma.JsonNull,
        includesCategories: ceremony.includes,
        timelineTemplate: ceremony.timelineTemplate ?? [],
      },
      create: {
        slug: ceremony.slug,
        family: ceremony.family,
        experienceMode: ceremony.experienceMode,
        name: ceremony.name,
        summary: ceremony.summary ?? Prisma.JsonNull,
        culturalNotes: ceremony.culturalNotes ?? Prisma.JsonNull,
        includesCategories: ceremony.includes,
        timelineTemplate: ceremony.timelineTemplate ?? [],
      },
    });
  }

  for (const venue of venues) {
    const existing = await prisma.venue.findUnique({ where: { slug: venue.slug } });
    await prisma.venue.upsert({
      where: { slug: venue.slug },
      update: {
        name: venue.name,
        area: venue.area,
        type: venue.type,
        capacityJson: venue.capacity ?? {},
        rulesJson: venue.rules ?? {},
        facilities: [],
        suitableFor: venue.suitableFor,
        accessible: venue.accessible ?? false,
        lat: venue.geo?.lat ?? null,
        lng: venue.geo?.lng ?? null,
        partnerStatus: venue.partnerStatus,
      },
      create: {
        id: existing?.id ?? generateId("ven_"),
        slug: venue.slug,
        name: venue.name,
        area: venue.area,
        type: venue.type,
        capacityJson: venue.capacity ?? {},
        rulesJson: venue.rules ?? {},
        facilities: [],
        suitableFor: venue.suitableFor,
        accessible: venue.accessible ?? false,
        lat: venue.geo?.lat ?? null,
        lng: venue.geo?.lng ?? null,
        partnerStatus: venue.partnerStatus,
      },
    });
  }

  for (const pkg of packages) {
    const existing = await prisma.package.findUnique({ where: { slug: pkg.slug } });
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {
        name: pkg.name,
        tier: pkg.tier ?? null,
        ceremonySlugs: pkg.ceremonySlugs,
        guestMin: pkg.guestMin,
        guestMax: pkg.guestMax,
        fromPriceIncGstCents: pkg.fromPriceIncGstCents,
        inclusionsJson: pkg.inclusions,
        addOnsJson: pkg.addOns ?? [],
        depositRuleJson: pkg.depositRule ?? { percent: 25, minCents: 50000 },
        active: true,
      },
      create: {
        id: existing?.id ?? generateId("pkg_"),
        slug: pkg.slug,
        name: pkg.name,
        tier: pkg.tier ?? null,
        ceremonySlugs: pkg.ceremonySlugs,
        guestMin: pkg.guestMin,
        guestMax: pkg.guestMax,
        fromPriceIncGstCents: pkg.fromPriceIncGstCents,
        inclusionsJson: pkg.inclusions,
        addOnsJson: pkg.addOns ?? [],
        depositRuleJson: pkg.depositRule ?? { percent: 25, minCents: 50000 },
        active: true,
      },
    });
  }

  const priceListVersion = "2026.10.1";
  const existingPriceList = await prisma.priceList.findUnique({
    where: { version: priceListVersion },
  });
  await prisma.priceList.upsert({
    where: { version: priceListVersion },
    update: {},
    create: {
      id: existingPriceList?.id ?? generateId("prc_"),
      version: priceListVersion,
      effectiveFrom: new Date("2026-10-01T00:00:00.000Z"),
      rulesJson: {
        currency: "AUD",
        note: "PLACEHOLDER – Perth launch indicative price list",
      },
    },
  });

  await prisma.taxInvoiceSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastValue: 0 },
  });

  return {
    ceremoniesCount: ceremonies.length,
    venuesCount: venues.length,
    packagesCount: packages.length,
    priceListVersion,
  };
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  const client = new PrismaClient();
  seedDatabase(client)
    .then(async (summary) => {
      console.info("Seeded Managevent database:", summary);
      await client.$disconnect();
    })
    .catch(async (err: unknown) => {
      console.error("Failed to seed database:", err);
      await client.$disconnect();
      process.exit(1);
    });
}
