/**
 * Canonical Builder request fixtures for every `CeremonyFamily` (`CELEBRATION`, `CULTURAL`, `CORPORATE`, `SOLEMN`).
 */
import type { BuilderEstimateRequestInput, CeremonyFamily } from "@managevent/types";

export const CEREMONY_FAMILY_BUILDER_FIXTURES: Readonly<
  Record<CeremonyFamily, BuilderEstimateRequestInput>
> = {
  CELEBRATION: {
    ceremonySlug: "wedding",
    adults: 110,
    children: 10,
    venueType: "WINERY",
    travelZone: "METRO",
    durationHours: 6,
    services: [
      { category: "planning", tier: "SIGNATURE" },
      { category: "styling", tier: "SIGNATURE" },
      { category: "catering", tier: "SIGNATURE" },
      { category: "cake-sweets", tier: "SIGNATURE" },
      { category: "florals", tier: "SIGNATURE" },
      { category: "photo-video", tier: "SIGNATURE" },
      { category: "entertainment", tier: "SIGNATURE" },
      { category: "invitations", tier: "SIGNATURE" },
    ],
    extras: ["photo-wall"],
    locale: "en",
  },
  CULTURAL: {
    ceremonySlug: "sofreh-aghd",
    adults: 60,
    children: 6,
    venueType: "PRIVATE_HOME",
    travelZone: "METRO",
    durationHours: 5,
    services: [
      { category: "planning", tier: "SIGNATURE" },
      { category: "sofreh-set", tier: "LUXE" },
      { category: "florals", tier: "SIGNATURE" },
      { category: "catering", tier: "SIGNATURE" },
      { category: "cake-sweets", tier: "SIGNATURE" },
      { category: "invitations", tier: "SIGNATURE" },
    ],
    extras: ["wishing-well"],
    locale: "fa",
  },
  CORPORATE: {
    ceremonySlug: "gala-dinner",
    adults: 200,
    children: 0,
    venueType: "FUNCTION_CENTRE",
    travelZone: "METRO",
    durationHours: 5,
    services: [
      { category: "planning", tier: "LUXE" },
      { category: "catering", tier: "LUXE" },
      { category: "av-lighting", tier: "LUXE" },
      { category: "entertainment", tier: "SIGNATURE" },
      { category: "staffing", tier: "SIGNATURE", hours: 6 },
    ],
    extras: ["transport"],
    locale: "en",
  },
  SOLEMN: {
    ceremonySlug: "celebration-of-life",
    adults: 80,
    children: 10,
    venueType: "COUNCIL_HALL",
    travelZone: "OUTER_METRO",
    durationHours: 4,
    services: [
      { category: "planning", tier: "ESSENTIAL" },
      { category: "tribute-display", tier: "SIGNATURE" },
      { category: "slideshow", tier: "ESSENTIAL" },
      { category: "catering", tier: "ESSENTIAL" },
      { category: "florals", tier: "ESSENTIAL" },
      { category: "invitations", tier: "ESSENTIAL" },
    ],
    extras: [],
    locale: "en",
  },
};
