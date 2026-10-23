import { z } from "zod";
import { LocalizedTextSchema } from "./content.js";
import {
  AbnSchema,
  AllergySeverityEnum,
  AuPhoneSchema,
  BuilderSessionIdSchema,
  CELEBRATION_THEME_IDS,
  CentsSchema,
  CurrencySchema,
  DietaryTagEnum,
  EnabledLocaleSchema,
  EstimateIdSchema,
  EventHeadcountIdSchema,
  EventIdSchema,
  EventStatusEnum,
  ExperienceModeEnum,
  GuestIdSchema,
  GuestTokenSchema,
  IanaTimeZoneSchema,
  InvitationIdSchema,
  InvitationPlanEnum,
  InvitationThemeIdEnum,
  LeadIdSchema,
  LeadSourceEnum,
  LeadStageEnum,
  LocaleSchema,
  MediaAssetIdSchema,
  MEMORIAL_THEME_IDS,
  MessageChannelEnum,
  OrderIdSchema,
  OrderLineIdSchema,
  OrderLineKindEnum,
  OrderLineUnitEnum,
  OrderStatusEnum,
  OrganisationIdSchema,
  PartyIdSchema,
  PassIdSchema,
  PaymentIdSchema,
  PaymentKindEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  RecommendationSetIdSchema,
  RecommendationStatusEnum,
  RsvpIdSchema,
  RsvpStatusEnum,
  SafeEventSlugSchema,
  ScanEventIdSchema,
  ServiceTierEnum,
  SignedCentsSchema,
  SlugSchema,
  SubEventIdSchema,
  TaxInvoiceIdSchema,
  TravelZoneEnum,
  UserIdSchema,
  VenueIdSchema,
  WellModeEnum,
} from "./primitives.js";

// ─── Standard API Envelope & Health ─────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
    requestId: z.string().min(1),
  }),
});

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("managevent-api"),
  region: z.string(),
  timestamp: z.string().datetime(),
});

// ─── Leads (`POST /v1/leads`) ───────────────────────────────────────────────

export const UtmSchema = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
  })
  .strict();

export const LeadCreateSchema = z.object({
  source: LeadSourceEnum,
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email(),
  phone: AuPhoneSchema.optional(),
  preferredLanguage: EnabledLocaleSchema.default("en"),
  preferredChannel: MessageChannelEnum.default("EMAIL"),
  ceremonySlug: SlugSchema.optional(),
  eventDate: z.string().datetime().optional(),
  dateFlexible: z.boolean().default(false),
  guestEstimate: z.number().int().min(1).max(5000).optional(),
  area: z.string().trim().max(120).optional(),
  message: z.string().trim().max(4000).optional(),
  estimateId: EstimateIdSchema.optional(),
  marketingConsent: z.boolean().default(false),
  utm: UtmSchema.optional(),
  /** Honeypot field: must be empty or omitted if submitted by a human. */
  websiteUrl: z.string().max(0).optional(),
});

export const LeadResponseSchema = z.object({
  id: LeadIdSchema,
  stage: LeadStageEnum,
  source: LeadSourceEnum,
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  preferredLanguage: z.string(),
  preferredChannel: MessageChannelEnum,
  ceremonySlug: z.string().nullable(),
  eventDate: z.string().datetime().nullable(),
  dateFlexible: z.boolean(),
  guestEstimate: z.number().int().nullable(),
  area: z.string().nullable(),
  estimateId: z.string().nullable(),
  marketingConsentId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

// ─── Builder & Estimate (`WEBSITE.md` §A6.4) ────────────────────────────────

export const BuilderServiceCategoryEnum = z.enum([
  "styling",
  "catering",
  "cake-sweets",
  "florals",
  "photo-video",
  "entertainment",
  "hire",
  "staffing",
  "av-lighting",
  "invitations",
  "sofreh-set",
  "tribute-display",
  "slideshow",
  "venue",
  "planning",
]);

export const BuilderServiceSelectionSchema = z.object({
  category: BuilderServiceCategoryEnum,
  tier: ServiceTierEnum,
  hours: z.number().int().min(1).max(24).optional(),
});

export const BuilderEstimateRequestSchema = z.object({
  ceremonySlug: SlugSchema,
  adults: z.number().int().min(1).max(2000),
  children: z.number().int().min(0).max(1000).default(0),
  venueType: z
    .enum([
      "HAVE_ONE",
      "HELP_CHOOSE",
      "PRIVATE_HOME",
      "COUNCIL_HALL",
      "WINERY",
      "PARK_RESERVE",
      "RESTAURANT",
      "FUNCTION_CENTRE",
    ])
    .default("HELP_CHOOSE"),
  travelZone: TravelZoneEnum.default("METRO"),
  durationHours: z.number().int().min(1).max(24).default(5),
  services: z.array(BuilderServiceSelectionSchema).min(1),
  extras: z
    .array(
      z.enum(["transport", "accommodation", "kids-entertainment", "photo-wall", "wishing-well"]),
    )
    .default([]),
  locale: EnabledLocaleSchema.default("en"),
});

export const BuilderEstimateCategoryBreakdownSchema = z.object({
  category: z.string().min(1),
  tier: ServiceTierEnum.optional(),
  driver: z.enum(["GUEST", "TABLE", "HOUR", "FIXED"]),
  quantity: z.number().int().min(1),
  baseIncGstCents: CentsSchema,
  lowIncGstCents: CentsSchema,
  highIncGstCents: CentsSchema,
  lowExGstCents: CentsSchema,
  lowGstCents: CentsSchema,
  highExGstCents: CentsSchema,
  highGstCents: CentsSchema,
});

export const BuilderEstimateResponseSchema = z.object({
  id: EstimateIdSchema.optional(),
  builderSessionId: BuilderSessionIdSchema.optional(),
  priceListVersion: z.string().min(1),
  currency: CurrencySchema,
  experienceMode: ExperienceModeEnum,
  quoteOnlyRegional: z.boolean(),
  lowIncGstCents: CentsSchema,
  highIncGstCents: CentsSchema,
  lowGstCents: CentsSchema,
  highGstCents: CentsSchema,
  depositPreviewIncGstCents: CentsSchema,
  breakdown: z.array(BuilderEstimateCategoryBreakdownSchema),
  assumptions: z.array(z.string()),
  disclaimerKey: z.literal("builder.estimate.disclaimer"),
  shareToken: z.string().optional(),
});

export const BuilderSessionSaveSchema = z.object({
  id: BuilderSessionIdSchema.optional(),
  anonymousKey: z.string().min(8).max(128),
  locale: EnabledLocaleSchema.default("en"),
  ceremonySlug: SlugSchema,
  state: BuilderEstimateRequestSchema,
});

// ─── Events & SubEvents ─────────────────────────────────────────────────────

export const SubEventInputSchema = z.object({
  title: LocalizedTextSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  venueId: VenueIdSchema.optional(),
  venueFreeText: z.string().max(300).optional(),
  order: z.number().int().min(0).default(0),
});

export const EventCreateSchema = z.object({
  title: LocalizedTextSchema,
  ceremonySlug: SlugSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  timeZone: IanaTimeZoneSchema.default("Australia/Perth"),
  venueId: VenueIdSchema.optional(),
  venueFreeText: z.string().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  guestCountTarget: z.number().int().min(1).max(5000).optional(),
  isAgencyManaged: z.boolean().default(false),
  subEvents: z.array(SubEventInputSchema).default([]),
});

export const EventUpdateSchema = EventCreateSchema.partial().extend({
  status: EventStatusEnum.optional(),
});

export const EventResponseSchema = z.object({
  id: EventIdSchema,
  ownerUserId: UserIdSchema,
  title: LocalizedTextSchema,
  ceremonySlug: SlugSchema,
  experienceMode: ExperienceModeEnum,
  status: EventStatusEnum,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  timeZone: IanaTimeZoneSchema,
  venueId: VenueIdSchema.nullable(),
  venueFreeText: z.string().nullable(),
  guestCountTarget: z.number().int().nullable(),
  isAgencyManaged: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Invitations (with Theme/Mode Compatibility per `WEBSITE.md` §B4) ────────

const memorialThemeSet = new Set<string>(MEMORIAL_THEME_IDS);
const celebrationThemeSet = new Set<string>(CELEBRATION_THEME_IDS);

export const InvitationCreateSchema = z
  .object({
    eventId: EventIdSchema,
    experienceMode: ExperienceModeEnum,
    eventSlug: SafeEventSlugSchema,
    templateSlug: SlugSchema,
    themeId: InvitationThemeIdEnum,
    languages: z.array(EnabledLocaleSchema).min(1),
    defaultLanguage: EnabledLocaleSchema.default("en"),
    gateStyle: z.enum(["wax-seal", "ribbon", "arch", "plain-fade"]),
    plan: InvitationPlanEnum.default("FREE"),
    rsvpDeadline: z.string().datetime().optional(),
    allowForwarding: z.boolean().default(true),
    wallEnabled: z.boolean().default(false),
    wallAutoApprove: z.boolean().default(false),
    wellMode: WellModeEnum.default("NONE"),
    content: z.record(z.string(), z.unknown()).default({}),
    rsvpConfig: z.record(z.string(), z.unknown()).default({}),
    wellConfig: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((val, ctx) => {
    if (val.experienceMode === "MEMORIAL") {
      if (!memorialThemeSet.has(val.themeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["themeId"],
          message: "Memorial events can only choose memorial themes",
        });
      }
      if (val.wallAutoApprove) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["wallAutoApprove"],
          message: "Photo wall auto-approval is forbidden in Memorial Mode",
        });
      }
      if (val.wellMode === "WISHING_WELL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["wellMode"],
          message: "Memorial events must use TRIBUTE_BOOK or NONE, not WISHING_WELL",
        });
      }
      if (val.gateStyle !== "plain-fade") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gateStyle"],
          message: "Memorial events must use the plain-fade gate style",
        });
      }
    } else if (!celebrationThemeSet.has(val.themeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["themeId"],
        message: "Celebration events cannot choose memorial themes",
      });
    }
  });

export const InvitationUpdateSchema = z.object({
  templateSlug: SlugSchema.optional(),
  themeId: InvitationThemeIdEnum.optional(),
  defaultLanguage: EnabledLocaleSchema.optional(),
  rsvpDeadline: z.string().datetime().optional(),
  allowForwarding: z.boolean().optional(),
  wallEnabled: z.boolean().optional(),
  wallAutoApprove: z.boolean().optional(),
  wellMode: WellModeEnum.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export const InvitationResponseSchema = z.object({
  id: InvitationIdSchema,
  eventId: EventIdSchema,
  eventSlug: SafeEventSlugSchema,
  templateSlug: SlugSchema,
  themeId: InvitationThemeIdEnum,
  languages: z.array(EnabledLocaleSchema),
  defaultLanguage: EnabledLocaleSchema,
  gateStyle: z.string(),
  plan: InvitationPlanEnum,
  rsvpDeadline: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  allowForwarding: z.boolean(),
  wallEnabled: z.boolean(),
  wallAutoApprove: z.boolean(),
  wellMode: WellModeEnum,
});

// ─── Parties & Guests ───────────────────────────────────────────────────────

export const PartyCreateSchema = z.object({
  invitationId: InvitationIdSchema,
  displayName: LocalizedTextSchema,
  maxSeats: z.number().int().min(1).max(20).default(2),
  allowPlusOnes: z.boolean().default(false),
  childrenAllowed: z.boolean().default(true),
  tags: z.array(z.string().min(1).max(40)).default([]),
  tableLabel: z.string().max(60).optional(),
});

export const PartyResponseSchema = z.object({
  id: PartyIdSchema,
  invitationId: InvitationIdSchema,
  stableId: z.string().min(1),
  displayName: LocalizedTextSchema,
  token: GuestTokenSchema,
  tokenRevokedAt: z.string().datetime().nullable(),
  maxSeats: z.number().int().min(1),
  allowPlusOnes: z.boolean(),
  childrenAllowed: z.boolean(),
  tags: z.array(z.string()),
  tableLabel: z.string().nullable(),
});

export const GuestCreateSchema = z.object({
  partyId: PartyIdSchema,
  name: LocalizedTextSchema,
  email: z.string().email().optional(),
  phone: AuPhoneSchema.optional(),
  isChild: z.boolean().default(false),
  isPlusOne: z.boolean().default(false),
});

export const GuestResponseSchema = z.object({
  id: GuestIdSchema,
  partyId: PartyIdSchema,
  stableId: z.string().min(1),
  name: LocalizedTextSchema,
  isChild: z.boolean(),
  isPlusOne: z.boolean(),
});

// ─── RSVP (`POST /v1/rsvp`) ─────────────────────────────────────────────────

export const GuestRsvpItemSchema = z
  .object({
    guestId: GuestIdSchema,
    status: RsvpStatusEnum,
    dietary: z.array(DietaryTagEnum).default([]),
    allergyNotes: z.string().max(500).optional(),
    allergySeverity: AllergySeverityEnum.optional(),
    accessibilityNotes: z.string().max(500).optional(),
    healthDataConsentGranted: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    const hasHealthData =
      val.dietary.some((d) => d !== "NONE") ||
      Boolean(val.allergyNotes) ||
      Boolean(val.allergySeverity) ||
      Boolean(val.accessibilityNotes);
    if (hasHealthData && !val.healthDataConsentGranted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["healthDataConsentGranted"],
        message: "Health data consent is required when submitting dietary or allergy information",
      });
    }
  });

export const RsvpSubmitSchema = z.object({
  token: GuestTokenSchema,
  idempotencyKey: z.string().min(8).max(128),
  guests: z.array(GuestRsvpItemSchema).min(1),
  songRequests: z.array(z.string().max(160)).max(3).default([]),
  messageToHost: z.string().max(1000).optional(),
  locale: LocaleSchema.default("en"),
});

export const RsvpResponseSchema = z.object({
  rsvpIds: z.array(RsvpIdSchema),
  headcountSnapshotId: EventHeadcountIdSchema,
  passes: z.array(
    z.object({
      id: PassIdSchema,
      guestId: GuestIdSchema.nullable(),
      partyId: PartyIdSchema,
      qrPayloadSig: z.string().min(16),
    }),
  ),
});

// ─── Passes & Check-in ──────────────────────────────────────────────────────

export const PassResponseSchema = z.object({
  id: PassIdSchema,
  guestId: GuestIdSchema.nullable(),
  partyId: PartyIdSchema,
  qrPayloadSig: z.string().min(16),
  checkedInAt: z.string().datetime().nullable(),
});

export const ScanEventCreateSchema = z.object({
  passId: PassIdSchema,
  eventId: EventIdSchema,
  deviceId: z.string().min(1).max(120),
  scannedAt: z.string().datetime(),
  clientUuid: z.string().uuid(),
});

export const ScanEventResponseSchema = z.object({
  id: ScanEventIdSchema,
  passId: PassIdSchema,
  result: z.enum(["OK", "DUPLICATE", "INVALID", "WRONG_EVENT"]),
  scannedAt: z.string().datetime(),
});

// ─── Orders & Recommendations (`ARCHITECTURE.md` §6) ────────────────────────

export const OrderLineInputSchema = z.object({
  kind: OrderLineKindEnum,
  refId: z.string().min(1),
  description: LocalizedTextSchema,
  qty: z.number().int().min(1),
  unit: OrderLineUnitEnum,
  unitPriceExGstCents: CentsSchema,
  vendorOrganisationId: OrganisationIdSchema.optional(),
  finalNumbersDueAt: z.string().datetime().optional(),
  logisticsKey: z.string().min(1).optional(),
});

export const OrderLineSchema = OrderLineInputSchema.extend({
  id: OrderLineIdSchema,
  orderId: OrderIdSchema,
  currency: CurrencySchema,
  amountExGstCents: CentsSchema,
  gstCents: CentsSchema,
  amountIncGstCents: CentsSchema,
});

export const OrderCreateSchema = z.object({
  eventId: EventIdSchema,
  priceListVersion: z.string().min(1),
  termsVersion: z.string().min(1),
  lines: z.array(OrderLineInputSchema).min(1),
});

export const OrderApplyRecommendationSchema = z.object({
  orderId: OrderIdSchema,
  recommendationSetId: RecommendationSetIdSchema,
  idempotencyKey: z.string().min(8).max(128),
});

export const OrderResponseSchema = z.object({
  id: OrderIdSchema,
  eventId: EventIdSchema,
  status: OrderStatusEnum,
  priceListVersion: z.string(),
  currency: CurrencySchema,
  totalExGstCents: CentsSchema,
  totalGstCents: CentsSchema,
  totalIncGstCents: CentsSchema,
  lines: z.array(OrderLineSchema),
});

export const RecommendationItemSchema = z.object({
  logisticsKey: z.string().min(1),
  category: z.enum(["catering", "cake", "seating", "hire", "staffing"]),
  currentQty: z.number().int().min(0),
  recommendedQty: z.number().int().min(0),
  unit: OrderLineUnitEnum,
  reason: z.string().min(1),
  deltaIncGstCents: SignedCentsSchema,
  advisoryOnlyAfterCutOff: z.boolean().default(false),
});

export const RecommendationSetResponseSchema = z.object({
  id: RecommendationSetIdSchema,
  eventId: EventIdSchema,
  orderId: OrderIdSchema.nullable(),
  basedOnHeadcountId: EventHeadcountIdSchema,
  rulesVersion: z.string().min(1),
  status: RecommendationStatusEnum,
  items: z.array(RecommendationItemSchema),
  createdAt: z.string().datetime(),
});

// ─── Payments & Tax Invoices (`PAYMENTS_AND_GST.md`) ────────────────────────

export const PaymentCreateSchema = z
  .object({
    orderId: OrderIdSchema.optional(),
    invitationId: InvitationIdSchema.optional(),
    kind: PaymentKindEnum,
    amountIncGstCents: CentsSchema.refine((v) => v > 0, {
      message: "Payment amount must be greater than 0 cents",
    }),
    method: PaymentMethodEnum,
    idempotencyKey: z.string().min(8).max(128),
  })
  .refine((val) => Boolean(val.orderId) || Boolean(val.invitationId), {
    message: "Either orderId or invitationId is required",
    path: ["orderId"],
  });

export const PaymentResponseSchema = z.object({
  id: PaymentIdSchema,
  orderId: OrderIdSchema.nullable(),
  invitationId: InvitationIdSchema.nullable(),
  kind: PaymentKindEnum,
  status: PaymentStatusEnum,
  currency: CurrencySchema,
  amountExGstCents: CentsSchema,
  gstCents: CentsSchema,
  amountIncGstCents: CentsSchema,
  stripePaymentIntentId: z.string().min(1),
  clientSecret: z.string().optional(),
  method: PaymentMethodEnum,
  paidAt: z.string().datetime().nullable(),
});

export const TaxCodeEnum = z.enum(["GST", "FRE", "INP"]);

export const TaxInvoiceLineSchema = z.object({
  description: z.string().min(1),
  qty: z.number().int().min(1),
  unitPriceIncGstCents: CentsSchema,
  taxCode: TaxCodeEnum.default("GST"),
  amountExGstCents: CentsSchema,
  gstCents: CentsSchema,
  amountIncGstCents: CentsSchema,
});

export const TaxInvoiceSchema = z
  .object({
    id: TaxInvoiceIdSchema,
    number: z.string().regex(/^INV-\d{6,}$/, "Invoice number must be sequential (e.g. INV-000001)"),
    title: z.literal("Tax invoice"),
    issuedAt: z.string().datetime(),
    supplierName: z.string().min(1),
    supplierAbn: AbnSchema,
    customerName: z.string().min(1).optional(),
    customerAbn: AbnSchema.optional(),
    currency: CurrencySchema,
    lines: z.array(TaxInvoiceLineSchema).min(1),
    totalExGstCents: CentsSchema,
    gstCents: CentsSchema,
    totalIncGstCents: CentsSchema,
    pdfMediaId: MediaAssetIdSchema,
  })
  .superRefine((inv, ctx) => {
    // ATO requirement: For sales of $1,000 (100,000 cents) or more, buyer identity or ABN is mandatory.
    if (inv.totalIncGstCents >= 100_000 && !inv.customerName && !inv.customerAbn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerName"],
        message:
          "ATO tax invoice requirement: sales of $1,000 or more must include buyer identity or ABN",
      });
    }
  });
