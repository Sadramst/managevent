import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getExperienceMode } from "@managevent/i18n";
import type { ExperienceMode } from "@managevent/types";
import { ContentCeremonySchema, ContentVenuesSchema } from "@managevent/validators";

export type Ceremony = ReturnType<typeof ContentCeremonySchema.parse>;
export type PerthVenue = ReturnType<typeof ContentVenuesSchema.parse>[number];

/** The five groups the ceremonies hub is organised into. */
export const CEREMONY_GROUPS = [
  "weddings",
  "milestones",
  "cultural",
  "corporate",
  "memorials",
] as const;
export type CeremonyGroup = (typeof CEREMONY_GROUPS)[number];

/** Editorial order on the hub and in related lists. Unlisted slugs follow alphabetically. */
const CEREMONY_ORDER = [
  "wedding",
  "engagement",
  "birthday-milestone",
  "anniversary",
  "baby-shower",
  "cultural-celebration",
  "gala-dinner",
  "celebration-of-life",
  "memorial-service",
  "wake",
];

const WEDDING_GROUP_SLUGS = new Set(["wedding", "engagement", "proposal"]);

/** Older or alternative slugs that redirect to the canonical ceremony page. */
export const CEREMONY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  "milestone-birthday": "birthday-milestone",
  "corporate-gala": "gala-dinner",
  "bridal-shower": "baby-shower",
  memorial: "memorial-service",
};

function orderIndex(slug: string): number {
  const index = CEREMONY_ORDER.indexOf(slug);
  return index === -1 ? CEREMONY_ORDER.length : index;
}

export function loadCeremonies(): Ceremony[] {
  const folder = resolve(process.cwd(), "../../content/ceremonies");
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      ContentCeremonySchema.parse(
        JSON.parse(readFileSync(resolve(folder, file), "utf8")) as unknown,
      ),
    )
    .sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug) || a.slug.localeCompare(b.slug, "en"));
}

export function loadPerthVenues(): PerthVenue[] {
  const filePath = resolve(process.cwd(), "../../content/locations/perth/venues.json");
  return ContentVenuesSchema.parse(JSON.parse(readFileSync(filePath, "utf8")) as unknown);
}

/** Finds one ceremony by its canonical slug. */
export function findCeremony(
  slug: string,
  ceremonies: readonly Ceremony[] = loadCeremonies(),
): Ceremony | undefined {
  return ceremonies.find((ceremony) => ceremony.slug === slug);
}

/** Memorial Mode for a ceremony, always through the shared helper. */
export function ceremonyMode(ceremony: Ceremony): ExperienceMode {
  return getExperienceMode({
    ceremonySlug: ceremony.slug,
    family: ceremony.family,
    experienceMode: ceremony.experienceMode,
  });
}

export function ceremonyGroup(ceremony: Ceremony): CeremonyGroup {
  if (ceremonyMode(ceremony) === "MEMORIAL") return "memorials";
  if (ceremony.family === "CORPORATE") return "corporate";
  if (ceremony.family === "CULTURAL") return "cultural";
  return WEDDING_GROUP_SLUGS.has(ceremony.slug) ? "weddings" : "milestones";
}

/** Ceremonies for each hub group, in editorial order. Empty groups are left out. */
export function groupCeremonies(
  ceremonies: readonly Ceremony[],
): { group: CeremonyGroup; ceremonies: Ceremony[] }[] {
  return CEREMONY_GROUPS.map((group) => ({
    group,
    ceremonies: ceremonies.filter((ceremony) => ceremonyGroup(ceremony) === group),
  })).filter((entry) => entry.ceremonies.length > 0);
}

/**
 * Related ceremonies that actually have a page. A memorial ceremony only ever relates to other
 * memorial ceremonies, so a solemn page never links to a celebration.
 */
export function relatedCeremonies(ceremony: Ceremony, ceremonies: readonly Ceremony[]): Ceremony[] {
  const memorial = ceremonyMode(ceremony) === "MEMORIAL";
  return (ceremony.relatedSlugs ?? [])
    .filter((slug) => slug !== ceremony.slug)
    .map((slug) => findCeremony(slug, ceremonies))
    .filter((related): related is Ceremony => related !== undefined)
    .filter((related) => !memorial || ceremonyMode(related) === "MEMORIAL");
}

/** Perth settings whose `suitableFor` lists this ceremony. */
export function settingsForCeremony(slug: string, venues: readonly PerthVenue[]): PerthVenue[] {
  return venues.filter((venue) => venue.suitableFor.includes(slug));
}

export interface OffsetCopy {
  timeBefore: string;
  timeStart: string;
  timeAfter: string;
  durationHours: string;
  durationMinutes: string;
  durationBoth: string;
}

function fill(template: string, params: Record<string, number | string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    const value = params[token];
    return value !== undefined ? String(value) : match;
  });
}

/** Formats a timeline offset in minutes, e.g. -150 -> "2 hr 30 min before", 0 -> "Arrival". */
export function formatTimelineOffset(offsetMinutes: number, copy: OffsetCopy): string {
  if (offsetMinutes === 0) return copy.timeStart;
  const total = Math.abs(offsetMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const duration =
    hours === 0
      ? fill(copy.durationMinutes, { minutes })
      : minutes === 0
        ? fill(copy.durationHours, { hours })
        : fill(copy.durationBoth, { hours, minutes });
  return fill(offsetMinutes < 0 ? copy.timeBefore : copy.timeAfter, { duration });
}
