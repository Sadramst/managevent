import { z } from "zod";
import {
  CeremonyFamilyEnum,
  CentsSchema,
  ConsentRecordIdSchema,
  ExperienceModeEnum,
  IanaTimeZoneSchema,
  ServiceTierEnum,
  SlugSchema,
} from "./primitives.js";

/**
 * Mirrors `content/schemas/localized.schema.json`.
 */
export const LocalizedTextSchema = z
  .object({
    en: z.string().min(1),
    fa: z.string().optional(),
    ar: z.string().optional(),
    zh: z.string().optional(),
    hi: z.string().optional(),
  })
  .strict();

export const ContentStatusEnum = z.enum(["placeholder", "draft", "published"]);

/**
 * Mirrors `content/schemas/ceremony.schema.json`.
 */
export const ContentCeremonySchema = z.object({
  slug: SlugSchema,
  status: ContentStatusEnum,
  faReview: z.enum(["needed", "done"]).optional(),
  family: CeremonyFamilyEnum,
  experienceMode: ExperienceModeEnum,
  name: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  culturalNotes: LocalizedTextSchema.optional(),
  includes: z.array(z.string().min(1)).min(1),
  timelineTemplate: z
    .array(
      z.object({
        offsetMinutes: z.number().int(),
        label: LocalizedTextSchema,
      }),
    )
    .optional(),
  faq: z
    .array(
      z.object({
        q: LocalizedTextSchema,
        a: LocalizedTextSchema,
      }),
    )
    .optional(),
  relatedSlugs: z.array(SlugSchema).optional(),
  seo: z
    .object({
      title: LocalizedTextSchema.optional(),
      description: LocalizedTextSchema.optional(),
    })
    .optional(),
});

/**
 * Mirrors `content/schemas/city.schema.json`.
 */
export const ContentCitySchema = z.object({
  slug: SlugSchema,
  status: z.enum(["live", "waitlist", "hidden"]),
  name: LocalizedTextSchema,
  state: z.string().optional(),
  timeZone: IanaTimeZoneSchema,
  areasServed: z.array(z.string().min(1)),
  travelZones: z.record(z.string(), z.unknown()).optional(),
  localIntro: LocalizedTextSchema.optional(),
});

/**
 * Mirrors `content/schemas/package.schema.json`.
 */
export const ContentPackageSchema = z
  .object({
    slug: SlugSchema,
    status: ContentStatusEnum,
    name: LocalizedTextSchema,
    tier: ServiceTierEnum.optional(),
    ceremonySlugs: z.array(SlugSchema).min(1),
    guestMin: z.number().int().min(1),
    guestMax: z.number().int().min(1),
    fromPriceIncGstCents: CentsSchema,
    inclusions: z
      .array(
        z.object({
          category: z.string().min(1),
          label: LocalizedTextSchema,
          qtyRule: z.string().optional(),
        }),
      )
      .min(1),
    addOns: z.array(z.record(z.string(), z.unknown())).optional(),
    exclusions: z.array(LocalizedTextSchema).optional(),
    depositRule: z
      .object({
        percent: z.number().min(0).max(100).optional(),
        minCents: CentsSchema.optional(),
      })
      .optional(),
  })
  .refine((pkg) => pkg.guestMax >= pkg.guestMin, {
    message: "guestMax must be greater than or equal to guestMin",
    path: ["guestMax"],
  });

/**
 * Mirrors `content/schemas/routes.schema.json`.
 */
export const ContentRoutesSchema = z.object({
  aliases: z.array(
    z.object({
      path: z.string().startsWith("/"),
      canonical: z.string().startsWith("/"),
      mode: z.enum(["redirect301", "renderWithCanonical"]),
      packageFilter: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

/**
 * Mirrors an item in `content/schemas/testimonial.schema.json`.
 */
export const ContentTestimonialItemSchema = z.object({
  id: z.string().min(1),
  verified: z.literal(true),
  consentRecordId: ConsentRecordIdSchema,
  quote: LocalizedTextSchema,
  author: z.string().min(1),
  ceremonySlug: SlugSchema,
  venueSlug: SlugSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

/**
 * Mirrors `content/schemas/testimonial.schema.json`.
 */
export const ContentTestimonialsSchema = z.array(ContentTestimonialItemSchema);

export const VenueTypeEnum = z.enum([
  "WINERY",
  "PARK_RESERVE",
  "HERITAGE",
  "COUNCIL_HALL",
  "FUNCTION_CENTRE",
  "RESTAURANT",
  "HOTEL",
  "PRIVATE_HOME",
  "OTHER",
]);

/**
 * Mirrors an item in `content/schemas/venue.schema.json`.
 */
export const ContentVenueItemSchema = z.object({
  slug: SlugSchema,
  status: ContentStatusEnum,
  partnerStatus: z.enum(["placeholder", "prospect", "partner"]),
  name: LocalizedTextSchema,
  area: z.string().min(1),
  type: VenueTypeEnum,
  capacity: z
    .object({
      banquet: z.number().int().positive().optional(),
      rounds: z.number().int().positive().optional(),
      cocktail: z.number().int().positive().optional(),
      theatre: z.number().int().positive().optional(),
    })
    .optional(),
  indoorOutdoor: z.enum(["INDOOR", "OUTDOOR", "BOTH"]).optional(),
  rules: z
    .object({
      curfew: z.string().optional(),
      byo: z.boolean().optional(),
      permitRequired: z.boolean().optional(),
      permitNotes: LocalizedTextSchema.optional(),
      insuranceRequiredCents: CentsSchema.optional(),
      noiseNotes: LocalizedTextSchema.optional(),
    })
    .optional(),
  accessible: z.boolean().optional(),
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  suitableFor: z.array(SlugSchema).min(1),
  notes: LocalizedTextSchema.optional(),
});

/**
 * Mirrors `content/schemas/venue.schema.json`.
 */
export const ContentVenuesSchema = z.array(ContentVenueItemSchema);
