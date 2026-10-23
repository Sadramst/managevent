/**
 * Versioned indicative price list for the Ceremony Builder (`WEBSITE.md` §A6.4).
 *
 * All rates are in integer AUD cents, GST-inclusive.
 * // DECISION-NEEDED(FND-09): Founder to confirm final Perth launch unit rates and outer-metro travel fee before Phase 1 go-live.
 */
import type {
  BuilderEstimateRequest,
  BuilderServiceCategory,
  OrderLineUnit,
  ServiceTier,
  TravelZone,
} from "@managevent/types";

export const CURRENT_PRICE_LIST_VERSION = "2026.10.1" as const;

export interface CategoryPriceRule {
  category: BuilderServiceCategory;
  driver: Extract<OrderLineUnit, "GUEST" | "TABLE" | "HOUR" | "FIXED">;
  /** Tier unit price in AUD cents incl. GST. */
  tiersIncGstCents: Readonly<Record<ServiceTier, number>>;
  /** Range band percentage (e.g. `10` means `-10%` low to `+10%` high). */
  bandPercent: number;
}

export const SERVICE_PRICE_RULES: Readonly<Record<BuilderServiceCategory, CategoryPriceRule>> = {
  planning: {
    category: "planning",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 120_000, SIGNATURE: 240_000, LUXE: 450_000 },
    bandPercent: 10,
  },
  venue: {
    category: "venue",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 150_000, SIGNATURE: 350_000, LUXE: 750_000 },
    bandPercent: 15,
  },
  styling: {
    category: "styling",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 140_000, SIGNATURE: 280_000, LUXE: 550_000 },
    bandPercent: 15,
  },
  catering: {
    category: "catering",
    driver: "GUEST",
    tiersIncGstCents: { ESSENTIAL: 6_500, SIGNATURE: 11_000, LUXE: 17_500 },
    bandPercent: 10,
  },
  "cake-sweets": {
    category: "cake-sweets",
    driver: "GUEST",
    tiersIncGstCents: { ESSENTIAL: 900, SIGNATURE: 1_500, LUXE: 2_400 },
    bandPercent: 10,
  },
  florals: {
    category: "florals",
    driver: "TABLE",
    tiersIncGstCents: { ESSENTIAL: 12_000, SIGNATURE: 24_000, LUXE: 45_000 },
    bandPercent: 15,
  },
  "photo-video": {
    category: "photo-video",
    driver: "HOUR",
    tiersIncGstCents: { ESSENTIAL: 35_000, SIGNATURE: 55_000, LUXE: 85_000 },
    bandPercent: 10,
  },
  entertainment: {
    category: "entertainment",
    driver: "HOUR",
    tiersIncGstCents: { ESSENTIAL: 22_000, SIGNATURE: 38_000, LUXE: 65_000 },
    bandPercent: 10,
  },
  hire: {
    category: "hire",
    driver: "GUEST",
    tiersIncGstCents: { ESSENTIAL: 1_800, SIGNATURE: 3_200, LUXE: 5_500 },
    bandPercent: 10,
  },
  staffing: {
    category: "staffing",
    driver: "HOUR",
    tiersIncGstCents: { ESSENTIAL: 6_500, SIGNATURE: 7_500, LUXE: 9_000 },
    bandPercent: 10,
  },
  "av-lighting": {
    category: "av-lighting",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 85_000, SIGNATURE: 165_000, LUXE: 320_000 },
    bandPercent: 12,
  },
  invitations: {
    category: "invitations",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 0, SIGNATURE: 6_900, LUXE: 19_900 },
    bandPercent: 0,
  },
  "sofreh-set": {
    category: "sofreh-set",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 95_000, SIGNATURE: 185_000, LUXE: 340_000 },
    bandPercent: 12,
  },
  "tribute-display": {
    category: "tribute-display",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 45_000, SIGNATURE: 85_000, LUXE: 145_000 },
    bandPercent: 10,
  },
  slideshow: {
    category: "slideshow",
    driver: "FIXED",
    tiersIncGstCents: { ESSENTIAL: 35_000, SIGNATURE: 65_000, LUXE: 110_000 },
    bandPercent: 10,
  },
};

export const VENUE_TYPE_ESTIMATE_INC_GST_CENTS: Readonly<
  Record<BuilderEstimateRequest["venueType"], number>
> = {
  HAVE_ONE: 0,
  HELP_CHOOSE: 220_000,
  PRIVATE_HOME: 85_000, // Marquee / site prep allowance
  COUNCIL_HALL: 65_000,
  WINERY: 380_000,
  PARK_RESERVE: 55_000, // Permit & outdoor setup allowance
  RESTAURANT: 180_000,
  FUNCTION_CENTRE: 320_000,
};

export const TRAVEL_ZONE_FEES_INC_GST_CENTS: Readonly<Record<TravelZone, number>> = {
  METRO: 0,
  OUTER_METRO: 35_000,
  REGIONAL: 0, // Regional is quote-only (`quoteOnlyRegional: true`)
};

export const EXTRAS_PRICE_INC_GST_CENTS: Readonly<
  Record<BuilderEstimateRequest["extras"][number], number>
> = {
  transport: 95_000,
  accommodation: 45_000,
  "kids-entertainment": 65_000,
  "photo-wall": 25_000,
  "wishing-well": 0,
};
