/**
 * Host-side invitation contract: identity (`GET /v1/me`), events, invitation content and
 * configuration, plan view and checkout.
 *
 * DTO text fields are plain strings (the API maps the stored `{ en }` JSON). Every instant is
 * paired with a `...Local` wall-clock value in the event time zone (`YYYY-MM-DDTHH:mm`).
 */
import { z } from "zod";
import {
  CELEBRATION_THEME_IDS,
  CentsSchema,
  CoHostRoleEnum,
  CurrencySchema,
  EventIdSchema,
  EventStatusEnum,
  ExperienceModeEnum,
  IanaTimeZoneSchema,
  InvitationIdSchema,
  InvitationPlanEnum,
  InvitationThemeIdEnum,
  MEMORIAL_THEME_IDS,
  RoleEnum,
  SafeEventSlugSchema,
  UserIdSchema,
  WellModeEnum,
} from "./primitives.js";

// ─── Small shared shapes ────────────────────────────────────────────────────

/** Host-supplied link (cover image, gallery, music, registry, maps). HTTPS only; no uploads yet. */
export const HttpsUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine((value) => value.startsWith("https://"), { message: "Must be an https:// URL" });
export type HttpsUrl = z.infer<typeof HttpsUrlSchema>;

const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

/** True when `YYYY-MM-DD` names a real calendar day (rejects 2026-02-31, month 13, and so on). */
function isRealCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Wall-clock date and time without an offset: `YYYY-MM-DDTHH:mm`, read in the event time zone. */
export const LocalDateTimeSchema = z
  .string()
  .regex(LOCAL_DATE_TIME_PATTERN, "Must be a local date and time in the form YYYY-MM-DDTHH:mm")
  .refine((value) => !LOCAL_DATE_TIME_PATTERN.test(value) || isRealCalendarDate(value), {
    message: "Must be a real calendar date",
  });
export type LocalDateTime = z.infer<typeof LocalDateTimeSchema>;

export const GateStyleEnum = z.enum(["wax-seal", "ribbon", "arch", "plain-fade"]);
export type GateStyle = z.infer<typeof GateStyleEnum>;

/** Occasions a host can choose in the Studio. The experience mode is derived from the slug. */
export const INVITATION_OCCASION_SLUGS = [
  "wedding",
  "engagement",
  "anniversary",
  "birthday",
  "baby-shower",
  "graduation",
  "corporate-event",
  "cultural-celebration",
  "other-celebration",
  "memorial-service",
  "celebration-of-life",
  "wake",
] as const;
export const InvitationOccasionSlugEnum = z.enum(INVITATION_OCCASION_SLUGS);
export type InvitationOccasionSlug = z.infer<typeof InvitationOccasionSlugEnum>;

export interface InvitationTemplate {
  slug: string;
  mode: z.infer<typeof ExperienceModeEnum>;
  defaultThemeId: z.infer<typeof InvitationThemeIdEnum>;
  defaultGateStyle: GateStyle;
  /** Available on the FREE plan. */
  free: boolean;
}

/** The template catalogue. One demo invitation exists per entry. */
export const INVITATION_TEMPLATES = [
  {
    slug: "royal-classic",
    mode: "CELEBRATION",
    defaultThemeId: "royal-ivory",
    defaultGateStyle: "wax-seal",
    free: true,
  },
  {
    slug: "modern-minimal",
    mode: "CELEBRATION",
    defaultThemeId: "alabaster-platinum",
    defaultGateStyle: "plain-fade",
    free: true,
  },
  {
    slug: "celestial-evening",
    mode: "CELEBRATION",
    defaultThemeId: "midnight-celestial",
    defaultGateStyle: "ribbon",
    free: false,
  },
  {
    slug: "botanic-garden",
    mode: "CELEBRATION",
    defaultThemeId: "emerald-botanic",
    defaultGateStyle: "arch",
    free: false,
  },
  {
    slug: "memorial-calm",
    mode: "MEMORIAL",
    defaultThemeId: "memorial-alabaster",
    defaultGateStyle: "plain-fade",
    free: true,
  },
  {
    slug: "memorial-linen",
    mode: "MEMORIAL",
    defaultThemeId: "memorial-slate",
    defaultGateStyle: "plain-fade",
    free: true,
  },
] as const satisfies readonly InvitationTemplate[];

export const InvitationTemplateSlugEnum = z.enum([
  "royal-classic",
  "modern-minimal",
  "celestial-evening",
  "botanic-garden",
  "memorial-calm",
  "memorial-linen",
]);
export type InvitationTemplateSlug = z.infer<typeof InvitationTemplateSlugEnum>;

/** Themes available on the FREE plan (celebration). Memorial events may use every memorial theme. */
export const FREE_THEME_IDS = [
  "royal-ivory",
  "alabaster-platinum",
  "memorial-alabaster",
  "memorial-slate",
] as const satisfies ReadonlyArray<
  (typeof CELEBRATION_THEME_IDS)[number] | (typeof MEMORIAL_THEME_IDS)[number]
>;

// ─── Invitation content (`Invitation.contentJson`) ──────────────────────────

export const ScheduleItemSchema = z.object({
  id: z.string().min(4).max(24),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be a time in the form HH:mm"),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(400).optional(),
  location: z.string().max(160).optional(),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const InvitationVenueSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().max(300),
  mapsUrl: HttpsUrlSchema.optional(),
  parking: z.string().max(500).optional(),
});
export type InvitationVenue = z.infer<typeof InvitationVenueSchema>;

export const InvitationMusicSchema = z
  .object({
    enabled: z.boolean().default(false),
    url: HttpsUrlSchema.nullable(),
    title: z.string().max(120).nullable(),
    /** The host attests they hold the rights to play this track. */
    rightsAttested: z.boolean(),
  })
  .superRefine((music, ctx) => {
    if (!music.enabled) return;
    if (music.url === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "A music URL is required when music is enabled",
      });
    }
    if (!music.rightsAttested) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rightsAttested"],
        message: "Music rights must be attested when music is enabled",
      });
    }
  });
export type InvitationMusic = z.infer<typeof InvitationMusicSchema>;

export const InvitationFaqItemSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
});
export type InvitationFaqItem = z.infer<typeof InvitationFaqItemSchema>;

export const InvitationContentSchema = z.object({
  version: z.literal(1),
  headline: z.string().trim().min(1).max(160),
  subheadline: z.string().max(240).default(""),
  hosts: z.string().trim().min(1).max(160),
  /** Memorial events: the person being remembered. */
  honoureeName: z.string().max(120).optional(),
  /** Plain text; `\n` is allowed. */
  wording: z.string().max(1200).default(""),
  story: z.array(z.string().max(1200)).max(8).default([]),
  schedule: z.array(ScheduleItemSchema).max(20).default([]),
  venue: InvitationVenueSchema.nullable(),
  dressCode: z.string().max(200).optional(),
  faq: z.array(InvitationFaqItemSchema).max(12).default([]),
  coverImageUrl: HttpsUrlSchema.nullable(),
  galleryImageUrls: z.array(HttpsUrlSchema).max(24).default([]),
  music: InvitationMusicSchema,
});
export type InvitationContent = z.infer<typeof InvitationContentSchema>;
export type InvitationContentInput = z.input<typeof InvitationContentSchema>;

export const SongPromptEnum = z.enum(["STANDARD", "MEMORIAL", "HIDDEN"]);
export type SongPrompt = z.infer<typeof SongPromptEnum>;

/**
 * `Invitation.rsvpConfigJson`. `songPrompt` defaults to `STANDARD` here; the API stores `HIDDEN`
 * for memorial events and rejects `STANDARD` for them.
 */
export const RsvpConfigSchema = z.object({
  allowMaybe: z.boolean().default(false),
  askDietary: z.boolean().default(true),
  askAccessibility: z.boolean().default(true),
  songPrompt: SongPromptEnum.default("STANDARD"),
  askMessage: z.boolean().default(true),
  askContact: z.boolean().default(false),
});
export type RsvpConfig = z.infer<typeof RsvpConfigSchema>;
export type RsvpConfigInput = z.input<typeof RsvpConfigSchema>;

/**
 * `Invitation.wellConfigJson`. Display details only: no money moves through Managevent (D-05a).
 * Memorial events may not carry bank or registry details; the API enforces that by mode.
 */
export const WellConfigSchema = z.object({
  message: z.string().max(600).optional(),
  payId: z.string().max(120).optional(),
  bsb: z
    .string()
    .regex(/^\d{3}-?\d{3}$/, "BSB must be six digits")
    .optional(),
  accountNumber: z
    .string()
    .regex(/^\d{4,10}$/, "Account number must be 4 to 10 digits")
    .optional(),
  accountName: z.string().max(120).optional(),
  registryUrl: HttpsUrlSchema.optional(),
  donationUrl: HttpsUrlSchema.optional(),
  tributePrompt: z.string().max(300).optional(),
});
export type WellConfig = z.infer<typeof WellConfigSchema>;

/** Well fields a memorial invitation must not carry. */
export const MEMORIAL_FORBIDDEN_WELL_FIELDS = [
  "payId",
  "bsb",
  "accountNumber",
  "accountName",
  "registryUrl",
] as const satisfies ReadonlyArray<keyof WellConfig>;

// ─── Identity (`GET /v1/me`) ────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  user: z
    .object({
      id: UserIdSchema,
      email: z.string().email(),
      name: z.string(),
      roles: z.array(RoleEnum),
      emailVerified: z.boolean(),
      twoFactorEnabled: z.boolean(),
    })
    .nullable(),
  /** What this deployment can really do, so the UI never offers an unavailable flow. */
  capabilities: z.object({
    emailPassword: z.literal(true),
    magicLink: z.boolean(),
    passwordReset: z.boolean(),
    emailInvitations: z.boolean(),
    stripeCheckout: z.boolean(),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// ─── Events ─────────────────────────────────────────────────────────────────

export const HostEventCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  ceremonySlug: InvitationOccasionSlugEnum,
  startsAtLocal: LocalDateTimeSchema,
  endsAtLocal: LocalDateTimeSchema.optional(),
  timeZone: IanaTimeZoneSchema.default("Australia/Perth"),
  templateSlug: InvitationTemplateSlugEnum,
  themeId: InvitationThemeIdEnum.optional(),
  hosts: z.string().trim().min(1).max(160),
  honoureeName: z.string().max(120).optional(),
  venue: z
    .object({
      name: z.string().trim().min(1).max(160),
      address: z.string().max(300),
    })
    .optional(),
});
export type HostEventCreate = z.infer<typeof HostEventCreateSchema>;
export type HostEventCreateInput = z.input<typeof HostEventCreateSchema>;

/** `ceremonySlug` is immutable, so it is not part of the update. */
export const HostEventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    startsAtLocal: LocalDateTimeSchema,
    endsAtLocal: LocalDateTimeSchema.nullable(),
    timeZone: IanaTimeZoneSchema,
  })
  .partial();
export type HostEventUpdate = z.infer<typeof HostEventUpdateSchema>;

export const EventSlugWordsSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

export const HostInvitationUpdateSchema = z
  .object({
    templateSlug: InvitationTemplateSlugEnum,
    themeId: InvitationThemeIdEnum,
    gateStyle: GateStyleEnum,
    /** Full replace of the stored content. */
    content: InvitationContentSchema,
    rsvpDeadlineLocal: LocalDateTimeSchema.nullable(),
    rsvpConfig: RsvpConfigSchema,
    allowForwarding: z.boolean(),
    wellMode: WellModeEnum,
    wellConfig: WellConfigSchema,
    /** The words part of the event slug; the 4-character suffix is kept. Premium, before publish. */
    eventSlugWords: EventSlugWordsSchema,
    /** Optimistic concurrency: the `invitation.updatedAt` the editor loaded. */
    expectedUpdatedAt: z.string().datetime(),
  })
  .partial();
export type HostInvitationUpdate = z.infer<typeof HostInvitationUpdateSchema>;
export type HostInvitationUpdateInput = z.input<typeof HostInvitationUpdateSchema>;

export const HostInvitationSchema = z.object({
  id: InvitationIdSchema,
  eventSlug: SafeEventSlugSchema,
  templateSlug: InvitationTemplateSlugEnum,
  themeId: InvitationThemeIdEnum,
  gateStyle: GateStyleEnum,
  /** The purchased plan. */
  plan: InvitationPlanEnum,
  /** The plan that applies after memorial complimentary Premium. */
  effectivePlan: InvitationPlanEnum,
  isDemo: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  rsvpDeadline: z.string().datetime().nullable(),
  rsvpDeadlineLocal: LocalDateTimeSchema.nullable(),
  allowForwarding: z.boolean(),
  wellMode: WellModeEnum,
  content: InvitationContentSchema,
  rsvpConfig: RsvpConfigSchema,
  wellConfig: WellConfigSchema,
  /** `/i/{eventSlug}/{firstPartyToken}`, or null while the guest list is empty. */
  previewPath: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type HostInvitation = z.infer<typeof HostInvitationSchema>;

const HostEventInvitationSummarySchema = z.object({
  id: InvitationIdSchema,
  eventSlug: SafeEventSlugSchema,
  templateSlug: InvitationTemplateSlugEnum,
  themeId: InvitationThemeIdEnum,
  plan: InvitationPlanEnum,
  effectivePlan: InvitationPlanEnum,
  publishedAt: z.string().datetime().nullable(),
});

export const HostEventSummarySchema = z.object({
  id: EventIdSchema,
  title: z.string(),
  ceremonySlug: z.string(),
  experienceMode: ExperienceModeEnum,
  status: EventStatusEnum,
  startsAt: z.string().datetime(),
  startsAtLocal: LocalDateTimeSchema,
  timeZone: IanaTimeZoneSchema,
  /** The caller's role on this event. Staff acting with `all` scope see `OWNER`. */
  role: CoHostRoleEnum,
  invitation: HostEventInvitationSummarySchema,
  counts: z.object({
    parties: z.number().int().nonnegative(),
    guests: z.number().int().nonnegative(),
    yes: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  updatedAt: z.string().datetime(),
});
export type HostEventSummary = z.infer<typeof HostEventSummarySchema>;

export const HostEventDetailSchema = HostEventSummarySchema.extend({
  endsAt: z.string().datetime().nullable(),
  endsAtLocal: LocalDateTimeSchema.nullable(),
  invitation: HostInvitationSchema,
  checklist: z.object({
    hasWording: z.boolean(),
    hasVenue: z.boolean(),
    hasGuests: z.boolean(),
    published: z.boolean(),
  }),
});
export type HostEventDetail = z.infer<typeof HostEventDetailSchema>;

export const HostEventListSchema = z.object({
  items: z.array(HostEventSummarySchema),
});
export type HostEventList = z.infer<typeof HostEventListSchema>;

/** Publish and unpublish return the full event detail. */
export const PublishResultSchema = HostEventDetailSchema;
export type PublishResult = z.infer<typeof PublishResultSchema>;

/** `details.missing` of a `422 PUBLISH_REQUIREMENTS_NOT_MET` response. */
export const PublishRequirementEnum = z.enum(["HEADLINE", "HOSTS", "VENUE", "START_IN_FUTURE"]);
export type PublishRequirement = z.infer<typeof PublishRequirementEnum>;

// ─── Plan and checkout ──────────────────────────────────────────────────────

const PlanLimitSchema = z.union([z.number().int().nonnegative(), z.literal("unlimited")]);

/** Mirrors `InvitationPlanEntitlements` in `@managevent/payments` without the retired bilingual flag. */
export const PlanEntitlementsSchema = z.object({
  plan: InvitationPlanEnum,
  label: z.string(),
  priceIncGstCents: CentsSchema,
  maxGuests: PlanLimitSchema,
  maxEmailInvitations: PlanLimitSchema,
  allThemesAndAnimations: z.boolean(),
  rsvpAndDietary: z.boolean(),
  rsvpReminders: z.boolean(),
  customEventSlug: z.boolean(),
  fullMusicLibraryAndUpload: z.boolean(),
  allGateStyles: z.boolean(),
  qrPassesAndCheckin: z.boolean(),
  livePhotoWallAndDisplay: z.boolean(),
  wellAndTributeExport: z.boolean(),
  bulkSmsAndWhatsapp: z.boolean(),
  pinProtection: z.boolean(),
  removeBranding: z.boolean(),
  automaticLogisticsBridge: z.boolean(),
});
export type PlanEntitlements = z.infer<typeof PlanEntitlementsSchema>;

export const UpgradeUnavailableReasonEnum = z.enum([
  "ALREADY_PREMIUM",
  "MEMORIAL_COMPLIMENTARY",
  "PAYMENTS_NOT_CONFIGURED",
]);
export type UpgradeUnavailableReason = z.infer<typeof UpgradeUnavailableReasonEnum>;

export const PlanViewSchema = z.object({
  plan: InvitationPlanEnum,
  effectivePlan: InvitationPlanEnum,
  experienceMode: ExperienceModeEnum,
  memorialComplimentary: z.boolean(),
  entitlements: PlanEntitlementsSchema,
  usage: z.object({
    guests: z.number().int().nonnegative(),
    guestLimit: z.number().int().nonnegative().nullable(),
    emailsSent: z.number().int().nonnegative(),
    emailLimit: z.number().int().nonnegative().nullable(),
  }),
  upgrade: z.object({
    available: z.boolean(),
    unavailableReason: UpgradeUnavailableReasonEnum.nullable(),
    /** GST-inclusive price of the Premium Event Pass, in AUD cents. */
    priceIncGstCents: CentsSchema,
    gstCents: CentsSchema,
    currency: CurrencySchema,
  }),
});
export type PlanView = z.infer<typeof PlanViewSchema>;

/** Reserved for future options; the body is an empty object today. */
export const CheckoutCreateSchema = z.object({});
export type CheckoutCreate = z.infer<typeof CheckoutCreateSchema>;

export const CheckoutSessionSchema = z.object({
  checkoutUrl: HttpsUrlSchema,
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

export const CheckoutConfirmSchema = z.object({
  sessionId: z.string().min(8).max(200),
});
export type CheckoutConfirm = z.infer<typeof CheckoutConfirmSchema>;
