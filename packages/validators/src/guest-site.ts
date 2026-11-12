/**
 * Guest micro-site contract: the token-authenticated invitation view, RSVP, passes, calendar and
 * wishes, plus door check-in and host moderation of well entries.
 *
 * Guest-safe rule: nothing in a guest view carries other parties, the token, emails, phones, the
 * salt, plan internals, or event/invitation/party ids. Health values are never echoed back.
 */
import { z } from "zod";
import {
  GateStyleEnum,
  HttpsUrlSchema,
  InvitationContentSchema,
  InvitationTemplateSlugEnum,
  LocalDateTimeSchema,
  RsvpConfigSchema,
} from "./invitation-host.js";
import {
  AllergySeverityEnum,
  AuPhoneSchema,
  DietaryTagEnum,
  EnabledLocaleSchema,
  EventHeadcountIdSchema,
  ExperienceModeEnum,
  GuestIdSchema,
  GuestTokenSchema,
  IanaTimeZoneSchema,
  InvitationThemeIdEnum,
  MediaModerationEnum,
  PassIdSchema,
  prefixedIdSchema,
  RsvpStatusEnum,
  SafeEventSlugSchema,
  ScanEventIdSchema,
  WellModeEnum,
} from "./primitives.js";

export const WellEntryIdSchema = prefixedIdSchema("wel_");

export const WellVisibilityEnum = z.enum(["HOSTS_ONLY", "WALL"]);
export type WellVisibility = z.infer<typeof WellVisibilityEnum>;

// ─── Guest invitation view ──────────────────────────────────────────────────

export const GuestMemberViewSchema = z.object({
  guestId: GuestIdSchema,
  name: z.string(),
  isChild: z.boolean(),
  isPlusOne: z.boolean(),
  status: RsvpStatusEnum,
  respondedAt: z.string().datetime().nullable(),
  /** True when dietary, allergy or accessibility details are stored. The values are never echoed. */
  healthOnFile: z.boolean(),
});
export type GuestMemberView = z.infer<typeof GuestMemberViewSchema>;

export const GuestWellViewSchema = z
  .object({
    mode: WellModeEnum,
    message: z.string().optional(),
    payId: z.string().optional(),
    bsb: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
    registryUrl: HttpsUrlSchema.optional(),
    donationUrl: HttpsUrlSchema.optional(),
    tributePrompt: z.string().optional(),
  })
  .nullable();
export type GuestWellView = z.infer<typeof GuestWellViewSchema>;

export const GuestWishSchema = z.object({
  id: WellEntryIdSchema,
  authorName: z.string(),
  message: z.string(),
  createdAt: z.string().datetime(),
});
export type GuestWish = z.infer<typeof GuestWishSchema>;

export const GuestEventPhaseEnum = z.enum(["UPCOMING", "PAST"]);
export type GuestEventPhase = z.infer<typeof GuestEventPhaseEnum>;

export const GuestRsvpStateEnum = z.enum(["OPEN", "CLOSED", "READ_ONLY"]);
export type GuestRsvpState = z.infer<typeof GuestRsvpStateEnum>;

/** The party block shared by the invitation view and the RSVP result. */
export const GuestPartyViewSchema = z.object({
  displayName: z.string(),
  maxSeats: z.number().int().positive(),
  allowPlusOnes: z.boolean(),
  childrenAllowed: z.boolean(),
  tableLabel: z.string().nullable(),
  members: z.array(GuestMemberViewSchema),
});
export type GuestPartyView = z.infer<typeof GuestPartyViewSchema>;

/** The RSVP block shared by the invitation view and the RSVP result. */
export const GuestRsvpViewSchema = z.object({
  /** `READ_ONLY` for demo invitations and draft previews. */
  state: GuestRsvpStateEnum,
  hasResponded: z.boolean(),
  lastRespondedAt: z.string().datetime().nullable(),
  seatsRemaining: z.number().int().nonnegative(),
  songRequests: z.array(z.string()),
  messageToHost: z.string().nullable(),
});
export type GuestRsvpView = z.infer<typeof GuestRsvpViewSchema>;

export const GuestInvitationViewSchema = z.object({
  /** True when a host is viewing an unpublished invitation. */
  preview: z.boolean(),
  /** True for sample invitations; every write is refused. */
  demo: z.boolean(),
  event: z.object({
    title: z.string(),
    ceremonySlug: z.string(),
    experienceMode: ExperienceModeEnum,
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().nullable(),
    startsAtLocal: LocalDateTimeSchema,
    endsAtLocal: LocalDateTimeSchema.nullable(),
    timeZone: IanaTimeZoneSchema,
    phase: GuestEventPhaseEnum,
  }),
  invitation: z.object({
    eventSlug: SafeEventSlugSchema,
    templateSlug: InvitationTemplateSlugEnum,
    themeId: InvitationThemeIdEnum,
    gateStyle: GateStyleEnum,
    allowForwarding: z.boolean(),
    showBranding: z.boolean(),
    content: InvitationContentSchema,
    rsvpDeadline: z.string().datetime().nullable(),
    rsvpDeadlineLocal: LocalDateTimeSchema.nullable(),
    rsvpConfig: RsvpConfigSchema,
    well: GuestWellViewSchema,
  }),
  party: GuestPartyViewSchema,
  rsvp: GuestRsvpViewSchema,
  features: z.object({
    passEnabled: z.boolean(),
    wishesEnabled: z.boolean(),
  }),
  /** `APPROVED` entries with `WALL` visibility only, newest 50. */
  wishes: z.array(GuestWishSchema),
});
export type GuestInvitationView = z.infer<typeof GuestInvitationViewSchema>;

export const GuestLinkStatusSchema = z.object({
  state: z.literal("ACTIVE"),
});
export type GuestLinkStatus = z.infer<typeof GuestLinkStatusSchema>;

// ─── RSVP ───────────────────────────────────────────────────────────────────

const ALLERGY_TAGS: ReadonlySet<string> = new Set([
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
]);

/** Health information (sensitive under the APPs). Requires `healthConsent` on the submission. */
export const GuestRsvpHealthSchema = z
  .object({
    dietary: z.array(DietaryTagEnum).max(9),
    allergyNotes: z.string().max(500).optional(),
    allergySeverity: AllergySeverityEnum.optional(),
    accessibilityNotes: z.string().max(500).optional(),
  })
  .superRefine((health, ctx) => {
    if (new Set(health.dietary).size !== health.dietary.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dietary"],
        message: "Dietary tags must be unique",
      });
    }
    if (health.dietary.includes("NONE") && health.dietary.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dietary"],
        message: "NONE cannot be combined with other dietary tags",
      });
    }
    if (health.allergySeverity && !health.dietary.some((tag) => ALLERGY_TAGS.has(tag))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allergySeverity"],
        message: "An allergy severity requires an allergy tag",
      });
    }
  });
export type GuestRsvpHealth = z.infer<typeof GuestRsvpHealthSchema>;

/** True when a health block actually carries health information (anything beyond `NONE`). */
export function hasHealthInformation(health: GuestRsvpHealth | undefined): boolean {
  if (!health) return false;
  return (
    health.dietary.some((tag) => tag !== "NONE") ||
    Boolean(health.allergyNotes) ||
    Boolean(health.allergySeverity) ||
    Boolean(health.accessibilityNotes)
  );
}

export const GuestRsvpMemberSchema = z.object({
  guestId: GuestIdSchema,
  status: z.enum(["YES", "NO", "MAYBE"]),
  /** Omitted means "keep what is on file". */
  health: GuestRsvpHealthSchema.optional(),
});
export type GuestRsvpMember = z.infer<typeof GuestRsvpMemberSchema>;

/** A guest the party adds. Status is implicitly `YES`. */
export const GuestRsvpPlusOneSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isChild: z.boolean().default(false),
  health: GuestRsvpHealthSchema.optional(),
});
export type GuestRsvpPlusOne = z.infer<typeof GuestRsvpPlusOneSchema>;

export const GuestRsvpContactSchema = z
  .object({
    email: z.string().trim().email().max(254).optional(),
    phone: AuPhoneSchema.optional(),
    consentGranted: z.literal(true),
  })
  .refine((contact) => Boolean(contact.email) || Boolean(contact.phone), {
    message: "Provide an email address or a phone number",
    path: ["email"],
  });
export type GuestRsvpContact = z.infer<typeof GuestRsvpContactSchema>;

export const GuestHealthConsentSchema = z.object({
  granted: z.literal(true),
  /** The exact consent wording shown to the guest, stored on the ConsentRecord. */
  textShown: z.string().min(20).max(600),
});
export type GuestHealthConsent = z.infer<typeof GuestHealthConsentSchema>;

export const GuestRsvpSubmitSchema = z
  .object({
    members: z.array(GuestRsvpMemberSchema).min(1).max(20),
    plusOnes: z.array(GuestRsvpPlusOneSchema).max(10).default([]),
    songRequests: z.array(z.string().trim().min(1).max(160)).max(3).default([]),
    messageToHost: z.string().max(1000).optional(),
    contact: GuestRsvpContactSchema.optional(),
    healthConsent: GuestHealthConsentSchema.optional(),
    locale: EnabledLocaleSchema.default("en"),
  })
  .superRefine((submission, ctx) => {
    const seen = new Set<string>();
    submission.members.forEach((member, index) => {
      if (seen.has(member.guestId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members", index, "guestId"],
          message: "Each guest may appear only once",
        });
      }
      seen.add(member.guestId);
    });

    const carriesHealth =
      submission.members.some((member) => hasHealthInformation(member.health)) ||
      submission.plusOnes.some((plusOne) => hasHealthInformation(plusOne.health));
    if (carriesHealth && !submission.healthConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["healthConsent"],
        message: "Consent is required to share dietary, allergy or accessibility information",
      });
    }
  });
export type GuestRsvpSubmit = z.infer<typeof GuestRsvpSubmitSchema>;
export type GuestRsvpSubmitInput = z.input<typeof GuestRsvpSubmitSchema>;

export const GuestPassSchema = z.object({
  passId: PassIdSchema,
  guestId: GuestIdSchema,
  guestName: z.string(),
  isChild: z.boolean(),
  /** `MV1.{passId}.{sig}`: opaque to the client, rendered as a QR code. */
  qr: z.string(),
  checkedInAt: z.string().datetime().nullable(),
});
export type GuestPass = z.infer<typeof GuestPassSchema>;

export const GuestRsvpResultSchema = z.object({
  /** True when this response replays an earlier submission with the same Idempotency-Key. */
  replayed: z.boolean(),
  party: GuestPartyViewSchema,
  rsvp: GuestRsvpViewSchema,
  headcountSnapshotId: EventHeadcountIdSchema,
  passes: z.array(GuestPassSchema),
});
export type GuestRsvpResult = z.infer<typeof GuestRsvpResultSchema>;

export const GuestPassesViewSchema = z.object({
  /** False when the plan does not include QR passes; `passes` is then empty. */
  enabled: z.boolean(),
  event: z.object({
    title: z.string(),
    startsAt: z.string().datetime(),
    startsAtLocal: LocalDateTimeSchema,
    timeZone: IanaTimeZoneSchema,
    venueName: z.string().nullable(),
  }),
  themeId: InvitationThemeIdEnum,
  experienceMode: ExperienceModeEnum,
  party: z.object({
    displayName: z.string(),
    tableLabel: z.string().nullable(),
  }),
  passes: z.array(GuestPassSchema),
});
export type GuestPassesView = z.infer<typeof GuestPassesViewSchema>;

export const GuestCalendarSchema = z.object({
  filename: z.string(),
  ics: z.string(),
});
export type GuestCalendar = z.infer<typeof GuestCalendarSchema>;

// ─── Wishes (wishing well and tribute book) ─────────────────────────────────

export const GuestWishSubmitSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(1000),
  shareOnWall: z.boolean().default(false),
});
export type GuestWishSubmit = z.infer<typeof GuestWishSubmitSchema>;
export type GuestWishSubmitInput = z.input<typeof GuestWishSubmitSchema>;

export const GuestWishResultSchema = z.object({
  id: WellEntryIdSchema,
  moderation: MediaModerationEnum,
  visibility: WellVisibilityEnum,
});
export type GuestWishResult = z.infer<typeof GuestWishResultSchema>;

// ─── Public gallery and legacy links ────────────────────────────────────────

export const DemoInvitationSchema = z.object({
  templateSlug: InvitationTemplateSlugEnum,
  themeId: InvitationThemeIdEnum,
  experienceMode: ExperienceModeEnum,
  title: z.string(),
  hosts: z.string(),
  headline: z.string(),
  eventSlug: SafeEventSlugSchema,
  guestToken: GuestTokenSchema,
});
export type DemoInvitation = z.infer<typeof DemoInvitationSchema>;

export const DemoListSchema = z.object({
  items: z.array(DemoInvitationSchema),
});
export type DemoList = z.infer<typeof DemoListSchema>;

export const LegacyResolveSchema = z.object({
  path: z.string().min(1).max(300),
});
export type LegacyResolve = z.infer<typeof LegacyResolveSchema>;

export const LegacyResolveResultSchema = z.object({
  eventSlug: SafeEventSlugSchema,
  guestToken: GuestTokenSchema,
});
export type LegacyResolveResult = z.infer<typeof LegacyResolveResultSchema>;

// ─── Door check-in ──────────────────────────────────────────────────────────

export const CheckInGuestSchema = z.object({
  guestId: GuestIdSchema,
  name: z.string(),
  isChild: z.boolean(),
  partyDisplayName: z.string(),
  partySize: z.number().int().nonnegative(),
  tableLabel: z.string().nullable(),
  status: RsvpStatusEnum,
  checkedInAt: z.string().datetime().nullable(),
  /** Flags only: the door never sees allergy notes. */
  severeAllergy: z.boolean(),
  dietaryFlags: z.array(DietaryTagEnum),
});
export type CheckInGuest = z.infer<typeof CheckInGuestSchema>;

export const CheckInRosterSchema = z.object({
  event: z.object({
    title: z.string(),
    startsAt: z.string().datetime(),
    startsAtLocal: LocalDateTimeSchema,
    timeZone: IanaTimeZoneSchema,
  }),
  totals: z.object({
    expected: z.number().int().nonnegative(),
    checkedIn: z.number().int().nonnegative(),
  }),
  guests: z.array(CheckInGuestSchema),
});
export type CheckInRoster = z.infer<typeof CheckInRosterSchema>;

const CheckInScanBaseShape = {
  deviceId: z.string().min(1).max(120),
  scannedAt: z.string().datetime(),
  /** Client-generated id that makes an offline replay of the same scan idempotent. */
  clientUuid: z.string().uuid(),
};

export const CheckInScanSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("QR"),
    qr: z.string().max(200),
    ...CheckInScanBaseShape,
  }),
  z.object({
    method: z.literal("MANUAL"),
    guestId: GuestIdSchema,
    ...CheckInScanBaseShape,
  }),
]);
export type CheckInScan = z.infer<typeof CheckInScanSchema>;

export const CheckInScanOutcomeEnum = z.enum(["OK", "DUPLICATE", "INVALID", "WRONG_EVENT"]);
export type CheckInScanOutcome = z.infer<typeof CheckInScanOutcomeEnum>;

export const CheckInScanResultSchema = z.object({
  result: CheckInScanOutcomeEnum,
  /** Null when the scan could not be tied to a pass (unparseable, unknown or bad signature). */
  scanEventId: ScanEventIdSchema.nullable(),
  guest: CheckInGuestSchema.nullable(),
  firstCheckedInAt: z.string().datetime().nullable(),
});
export type CheckInScanResult = z.infer<typeof CheckInScanResultSchema>;

// ─── Host moderation of well entries ────────────────────────────────────────

export const HostWellEntrySchema = z.object({
  id: WellEntryIdSchema,
  partyDisplayName: z.string().nullable(),
  authorName: z.string(),
  message: z.string(),
  visibility: WellVisibilityEnum,
  moderation: MediaModerationEnum,
  createdAt: z.string().datetime(),
});
export type HostWellEntry = z.infer<typeof HostWellEntrySchema>;

export const HostWellEntryListSchema = z.object({
  items: z.array(HostWellEntrySchema),
});
export type HostWellEntryList = z.infer<typeof HostWellEntryListSchema>;

export const HostWellEntryListQuerySchema = z.object({
  moderation: MediaModerationEnum.optional(),
});
export type HostWellEntryListQuery = z.infer<typeof HostWellEntryListQuerySchema>;

export const WellEntryModerateSchema = z.object({
  moderation: z.enum(["APPROVED", "REJECTED"]),
});
export type WellEntryModerate = z.infer<typeof WellEntryModerateSchema>;
