import { describe, expect, it } from "vitest";
import { ceremonyPagesEn } from "@managevent/i18n";
import {
  CEREMONY_GROUPS,
  CEREMONY_SLUG_ALIASES,
  ceremonyGroup,
  ceremonyMode,
  findCeremony,
  formatTimelineOffset,
  groupCeremonies,
  loadCeremonies,
  loadPerthVenues,
  relatedCeremonies,
  settingsForCeremony,
} from "./content";

const ceremonies = loadCeremonies();
const venues = loadPerthVenues();

/** Every English string in a content record, for wording checks. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("ceremony content", () => {
  it("has the launch set of ceremonies with full page content", () => {
    const slugs = ceremonies.map((ceremony) => ceremony.slug);
    for (const slug of [
      "wedding",
      "engagement",
      "birthday-milestone",
      "anniversary",
      "gala-dinner",
      "cultural-celebration",
      "baby-shower",
      "celebration-of-life",
      "memorial-service",
    ]) {
      expect(slugs).toContain(slug);
    }
    for (const ceremony of ceremonies) {
      expect(ceremony.status, ceremony.slug).not.toBe("placeholder");
      expect(ceremony.audience?.en, ceremony.slug).toBeTruthy();
      expect(ceremony.handles?.length ?? 0, ceremony.slug).toBeGreaterThanOrEqual(5);
      expect(ceremony.timelineTemplate?.length ?? 0, ceremony.slug).toBeGreaterThanOrEqual(4);
      expect(ceremony.localNotes?.length ?? 0, ceremony.slug).toBeGreaterThanOrEqual(3);
      expect(ceremony.faq?.length ?? 0, ceremony.slug).toBeGreaterThanOrEqual(3);
      expect(ceremony.guestGuidance?.en, ceremony.slug).toBeTruthy();
      expect(ceremony.invitationNotes?.en, ceremony.slug).toBeTruthy();
      expect(ceremony.seo?.title?.en, ceremony.slug).toBeTruthy();
      expect(ceremony.seo?.description?.en.length ?? 0, ceremony.slug).toBeLessThanOrEqual(170);
    }
  });

  it("keeps timeline steps in order with one arrival step", () => {
    for (const ceremony of ceremonies) {
      const offsets = (ceremony.timelineTemplate ?? []).map((step) => step.offsetMinutes);
      expect(
        [...offsets].sort((a, b) => a - b),
        ceremony.slug,
      ).toEqual(offsets);
      expect(new Set(offsets).size, ceremony.slug).toBe(offsets.length);
      expect(offsets.filter((offset) => offset === 0).length, ceremony.slug).toBe(1);
    }
  });

  it("renders solemn ceremonies in Memorial Mode and keeps their links solemn", () => {
    for (const slug of ["celebration-of-life", "memorial-service", "wake"]) {
      const ceremony = findCeremony(slug, ceremonies);
      expect(ceremony, slug).toBeDefined();
      if (!ceremony) continue;
      expect(ceremonyMode(ceremony)).toBe("MEMORIAL");
      expect(ceremonyGroup(ceremony)).toBe("memorials");
      const related = relatedCeremonies(ceremony, ceremonies);
      expect(related.length).toBeGreaterThan(0);
      for (const item of related) expect(ceremonyMode(item)).toBe("MEMORIAL");
      // Memorial tone: no celebratory or sales language (docs/design/MEMORIAL_MODE.md).
      const text = strings(ceremony).join(" ");
      expect(text).not.toMatch(/\bparty\b|\bfun\b|book now|premium|discount|!/i);
      // D-09: the funeral-director boundary is stated on every memorial page.
      expect(text).toMatch(/do not provide funeral director services/i);
    }
    const wedding = findCeremony("wedding", ceremonies);
    expect(wedding && ceremonyMode(wedding)).toBe("CELEBRATION");
  });

  it("only relates ceremonies that have a page, and aliases point at real pages", () => {
    for (const ceremony of ceremonies) {
      for (const slug of ceremony.relatedSlugs ?? []) {
        expect(findCeremony(slug, ceremonies), `${ceremony.slug} -> ${slug}`).toBeDefined();
      }
    }
    for (const [alias, target] of Object.entries(CEREMONY_SLUG_ALIASES)) {
      expect(findCeremony(alias, ceremonies), alias).toBeUndefined();
      expect(findCeremony(target, ceremonies), target).toBeDefined();
    }
  });

  it("groups every ceremony into one of the five hub groups", () => {
    const groups = groupCeremonies(ceremonies);
    expect(groups.map((entry) => entry.group)).toEqual([...CEREMONY_GROUPS]);
    expect(groups.flatMap((entry) => entry.ceremonies)).toHaveLength(ceremonies.length);
  });

  it("does not describe features or prices the product does not have", () => {
    // Record status fields legitimately hold the word "placeholder"; visible copy must not.
    const text = [...strings(ceremonies), ...strings(venues), ...strings(ceremonyPagesEn)]
      .filter((value) => value !== "placeholder")
      .join(" ");
    expect(text).not.toMatch(/photo wall|\bSMS\b|Apple Wallet|Google Wallet|\bAI\b|live-?stream/i);
    expect(text).not.toMatch(/placeholder|\bTBC\b|award-winning|testimonial/i);
    // No dollar figures in content: agency prices are quoted, invitation prices are interpolated.
    expect(text).not.toMatch(/\$\s?\d/);
  });
});

describe("Perth settings", () => {
  it("are described as kinds of setting, never as partners or placeholders", () => {
    expect(venues.length).toBeGreaterThanOrEqual(8);
    for (const venue of venues) {
      expect(venue.slug).not.toMatch(/placeholder/);
      expect(venue.partnerStatus).not.toBe("partner");
      expect(venue.notes?.en, venue.slug).toBeTruthy();
      if (venue.rules?.permitRequired) expect(venue.rules.permitNotes?.en).toBeTruthy();
    }
  });

  it("offer at least one setting for every ceremony", () => {
    for (const ceremony of ceremonies) {
      expect(settingsForCeremony(ceremony.slug, venues).length, ceremony.slug).toBeGreaterThan(0);
    }
  });
});

describe("formatTimelineOffset", () => {
  const copy = ceremonyPagesEn.detail;
  it("formats offsets before, at and after arrival", () => {
    expect(formatTimelineOffset(0, copy)).toBe("Arrival");
    expect(formatTimelineOffset(-120, copy)).toBe("2 hr before");
    expect(formatTimelineOffset(-30, copy)).toBe("30 min before");
    expect(formatTimelineOffset(-150, copy)).toBe("2 hr 30 min before");
    expect(formatTimelineOffset(75, copy)).toBe("1 hr 15 min in");
  });
});
