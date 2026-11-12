/**
 * Host guest-list contract: parties and guests, CSV import, responses and dietary summaries,
 * email campaigns, unsubscribe, and the staff CRM inbox.
 */
import { z } from "zod";
import { DietaryCountsSchema, LeadResponseSchema, UtmSchema } from "./api.js";
import { LocalDateTimeSchema } from "./invitation-host.js";
import {
  AllergySeverityEnum,
  AuPhoneSchema,
  CampaignIdSchema,
  DietaryTagEnum,
  EventHeadcountIdSchema,
  GuestIdSchema,
  GuestTokenSchema,
  LeadIdSchema,
  LeadStageEnum,
  PartyIdSchema,
  RsvpStatusEnum,
  UserIdSchema,
} from "./primitives.js";

const count = () => z.number().int().nonnegative();

// ─── Parties and guests ─────────────────────────────────────────────────────

export const HostGuestSchema = z.object({
  id: GuestIdSchema,
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isChild: z.boolean(),
  isPlusOne: z.boolean(),
  status: RsvpStatusEnum,
  respondedAt: z.string().datetime().nullable(),
  checkedInAt: z.string().datetime().nullable(),
});
export type HostGuest = z.infer<typeof HostGuestSchema>;

export const HostPartySchema = z.object({
  id: PartyIdSchema,
  displayName: z.string(),
  /**
   * The party's guest link token. It is the credential for answering as the party, so it is only
   * returned to callers who may write to the guest list (`guest:write`); null for read-only
   * callers such as a VIEWER co-host.
   */
  token: GuestTokenSchema.nullable(),
  /** `/i/{eventSlug}/{token}`; null whenever `token` is null. */
  invitePath: z.string().nullable(),
  tokenRevokedAt: z.string().datetime().nullable(),
  maxSeats: z.number().int().positive(),
  allowPlusOnes: z.boolean(),
  childrenAllowed: z.boolean(),
  tags: z.array(z.string()),
  tableLabel: z.string().nullable(),
  /** Any `YES` → `YES`; else any `MAYBE` → `MAYBE`; else every guest `NO` → `NO`; else `PENDING`. */
  status: RsvpStatusEnum,
  respondedAt: z.string().datetime().nullable(),
  email: z.object({
    hasAddress: z.boolean(),
    inviteSentAt: z.string().datetime().nullable(),
    remindersSent: count(),
  }),
  guests: z.array(HostGuestSchema),
  createdAt: z.string().datetime(),
});
export type HostParty = z.infer<typeof HostPartySchema>;

export const HostPartyListQuerySchema = z.object({
  status: RsvpStatusEnum.optional(),
  tag: z.string().min(1).max(40).optional(),
  q: z.string().max(80).optional(),
  cursor: PartyIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
export type HostPartyListQuery = z.infer<typeof HostPartyListQuerySchema>;
export type HostPartyListQueryInput = z.input<typeof HostPartyListQuerySchema>;

export const HostPartyListSchema = z.object({
  items: z.array(HostPartySchema),
  nextCursor: PartyIdSchema.nullable(),
  totals: z.object({ parties: count(), guests: count() }),
});
export type HostPartyList = z.infer<typeof HostPartyListSchema>;

export const HostGuestInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional(),
  phone: AuPhoneSchema.optional(),
  isChild: z.boolean().default(false),
});
/** What a caller sends (defaults optional). `HostGuestInputParsed` is the validated shape. */
export type HostGuestInput = z.input<typeof HostGuestInputSchema>;
export type HostGuestInputParsed = z.infer<typeof HostGuestInputSchema>;

/**
 * Empty `guests` creates one guest named `displayName`. `maxSeats` defaults to
 * `max(guests.length, 1)` in the API.
 */
export const HostPartyCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  maxSeats: z.number().int().min(1).max(20).optional(),
  allowPlusOnes: z.boolean().default(false),
  childrenAllowed: z.boolean().default(true),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  tableLabel: z.string().max(60).optional(),
  guests: z.array(HostGuestInputSchema).max(20).default([]),
});
export type HostPartyCreate = z.infer<typeof HostPartyCreateSchema>;
export type HostPartyCreateInput = z.input<typeof HostPartyCreateSchema>;

export const HostPartyUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    maxSeats: z.number().int().min(1).max(20),
    allowPlusOnes: z.boolean(),
    childrenAllowed: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10),
    tableLabel: z.string().max(60).nullable(),
  })
  .partial();
export type HostPartyUpdate = z.infer<typeof HostPartyUpdateSchema>;

export const HostGuestUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).nullable(),
    phone: AuPhoneSchema.nullable(),
    isChild: z.boolean(),
  })
  .partial();
export type HostGuestUpdate = z.infer<typeof HostGuestUpdateSchema>;

/** Host entry on a party's behalf. No health data is accepted here. */
export const HostRsvpEntrySchema = z.object({
  members: z.array(z.object({ guestId: GuestIdSchema, status: RsvpStatusEnum })).min(1),
});
export type HostRsvpEntry = z.infer<typeof HostRsvpEntrySchema>;

// ─── CSV import ─────────────────────────────────────────────────────────────

export const GuestImportSchema = z.object({
  csv: z.string().min(1).max(500_000),
  dryRun: z.boolean().default(true),
});
export type GuestImport = z.infer<typeof GuestImportSchema>;
export type GuestImportInput = z.input<typeof GuestImportSchema>;

export const GuestImportErrorCodeEnum = z.enum([
  "MISSING_NAME",
  "INVALID_EMAIL",
  "INVALID_PHONE",
  "PARTY_TOO_LARGE",
  "TOO_MANY_ROWS",
]);
export type GuestImportErrorCode = z.infer<typeof GuestImportErrorCodeEnum>;

export const GuestImportResultSchema = z.object({
  dryRun: z.boolean(),
  parties: z.array(
    z.object({
      displayName: z.string(),
      maxSeats: z.number().int().positive(),
      tableLabel: z.string().nullable(),
      tags: z.array(z.string()),
      guests: z.array(
        z.object({
          name: z.string(),
          isChild: z.boolean(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
        }),
      ),
    }),
  ),
  /** Empty on a dry run. */
  createdPartyIds: z.array(PartyIdSchema),
  summary: z.object({ partyCount: count(), guestCount: count(), skippedRows: count() }),
  errors: z.array(
    z.object({
      /** 1-based row number in the uploaded file (the header is row 1). */
      row: z.number().int().positive(),
      code: GuestImportErrorCodeEnum,
      message: z.string(),
    }),
  ),
  plan: z.object({
    limit: count().nullable(),
    current: count(),
    afterImport: count(),
    exceeds: z.boolean(),
  }),
});
export type GuestImportResult = z.infer<typeof GuestImportResultSchema>;

// ─── Responses ──────────────────────────────────────────────────────────────

export const RsvpDeadlineStateEnum = z.enum(["NONE", "OPEN", "DUE_TODAY", "CLOSED"]);
export type RsvpDeadlineState = z.infer<typeof RsvpDeadlineStateEnum>;

export const HeadcountTriggerEnum = z.enum(["RSVP", "HOST_EDIT", "SCHEDULED"]);
export type HeadcountTrigger = z.infer<typeof HeadcountTriggerEnum>;

export const ResponsesSummarySchema = z.object({
  totals: z.object({
    parties: count(),
    partiesResponded: count(),
    guests: count(),
    adultsYes: count(),
    childrenYes: count(),
    maybe: count(),
    no: count(),
    pending: count(),
    checkedIn: count(),
  }),
  /** Counts only, never names. */
  dietaryCounts: DietaryCountsSchema,
  severeAllergyCount: count(),
  songRequests: z.array(z.object({ partyDisplayName: z.string(), song: z.string() })),
  messages: z.array(
    z.object({
      partyDisplayName: z.string(),
      message: z.string(),
      respondedAt: z.string().datetime(),
    }),
  ),
  recent: z
    .array(
      z.object({
        partyDisplayName: z.string(),
        status: RsvpStatusEnum,
        respondedAt: z.string().datetime(),
      }),
    )
    .max(10),
  deadline: z.object({
    rsvpDeadline: z.string().datetime().nullable(),
    rsvpDeadlineLocal: LocalDateTimeSchema.nullable(),
    state: RsvpDeadlineStateEnum,
    /** Whole days until (positive) or since (negative) the deadline; null when there is none. */
    days: z.number().int().nullable(),
  }),
  latestHeadcount: z
    .object({
      id: EventHeadcountIdSchema,
      takenAt: z.string().datetime(),
      trigger: HeadcountTriggerEnum,
    })
    .nullable(),
  /** True when the event has an agency order that the headcount feeds. */
  linkedOrder: z.boolean(),
});
export type ResponsesSummary = z.infer<typeof ResponsesSummarySchema>;

/** Per-guest health detail. Requires `health:read`; staff access is audit-logged. */
export const DietaryMatrixSchema = z.object({
  rows: z.array(
    z.object({
      guestId: GuestIdSchema,
      guestName: z.string(),
      partyDisplayName: z.string(),
      tableLabel: z.string().nullable(),
      isChild: z.boolean(),
      dietary: z.array(DietaryTagEnum),
      allergySeverity: AllergySeverityEnum.nullable(),
      allergyNotes: z.string().nullable(),
      accessibilityNotes: z.string().nullable(),
    }),
  ),
  counts: DietaryCountsSchema,
  byTable: z.array(
    z.object({
      tableLabel: z.string().nullable(),
      counts: DietaryCountsSchema,
      severe: count(),
    }),
  ),
});
export type DietaryMatrix = z.infer<typeof DietaryMatrixSchema>;

// ─── Messaging ──────────────────────────────────────────────────────────────

export const EmailCampaignCreateSchema = z.object({
  /** For reminders, `"ALL"` means every party with a pending guest. */
  partyIds: z.union([z.array(PartyIdSchema).min(1).max(500), z.literal("ALL")]),
  /** The host attests they may email these guests about this event (Spam Act). */
  consentAttested: z.literal(true),
});
export type EmailCampaignCreate = z.infer<typeof EmailCampaignCreateSchema>;

export const EmailCampaignSkipReasonEnum = z.enum([
  "NO_EMAIL",
  "UNSUBSCRIBED",
  "ALREADY_SENT",
  "LINK_REVOKED",
  "REMINDER_LIMIT",
  "NOT_PENDING",
]);
export type EmailCampaignSkipReason = z.infer<typeof EmailCampaignSkipReasonEnum>;

export const EmailCampaignResultSchema = z.object({
  campaignId: CampaignIdSchema,
  queued: count(),
  skipped: z.array(z.object({ partyId: PartyIdSchema, reason: EmailCampaignSkipReasonEnum })),
});
export type EmailCampaignResult = z.infer<typeof EmailCampaignResultSchema>;

export const EmailCampaignKindEnum = z.enum(["INVITE", "REMINDER"]);
export type EmailCampaignKind = z.infer<typeof EmailCampaignKindEnum>;

export const EmailCampaignStatusEnum = z.enum(["QUEUED", "SENDING", "SENT", "PARTIAL", "FAILED"]);
export type EmailCampaignStatus = z.infer<typeof EmailCampaignStatusEnum>;

export const MessagingStatusSchema = z.object({
  /** False when no email provider is configured; sending then returns `503 EMAIL_NOT_CONFIGURED`. */
  emailConfigured: z.boolean(),
  remindersEntitled: z.boolean(),
  quota: z.object({ limit: count().nullable(), used: count() }),
  campaigns: z.array(
    z.object({
      id: CampaignIdSchema,
      kind: EmailCampaignKindEnum,
      status: EmailCampaignStatusEnum,
      createdAt: z.string().datetime(),
      counts: z.object({ total: count(), sent: count(), failed: count(), skipped: count() }),
    }),
  ),
});
export type MessagingStatus = z.infer<typeof MessagingStatusSchema>;

export const UnsubscribeSchema = z.object({
  token: z.string().min(20).max(400),
});
export type Unsubscribe = z.infer<typeof UnsubscribeSchema>;

export const UnsubscribeResultSchema = z.object({ ok: z.literal(true) });
export type UnsubscribeResult = z.infer<typeof UnsubscribeResultSchema>;

// ─── CRM inbox (staff) ──────────────────────────────────────────────────────

export const LeadListQuerySchema = z.object({
  stage: LeadStageEnum.optional(),
  q: z.string().max(80).optional(),
  cursor: LeadIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;
export type LeadListQueryInput = z.input<typeof LeadListQuerySchema>;

export const LeadListSchema = z.object({
  items: z.array(LeadResponseSchema),
  nextCursor: LeadIdSchema.nullable(),
});
export type LeadList = z.infer<typeof LeadListSchema>;

export const LeadDetailSchema = LeadResponseSchema.extend({
  message: z.string().nullable(),
  utm: UtmSchema.nullable(),
  /** Internal planner notes. */
  notes: z.string().nullable(),
  assignedToUserId: UserIdSchema.nullable(),
  eventId: z.string().nullable(),
  marketingConsent: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type LeadDetail = z.infer<typeof LeadDetailSchema>;

export const LeadUpdateSchema = z
  .object({
    stage: LeadStageEnum.optional(),
    notes: z.string().max(5000).nullable().optional(),
    assignedToUserId: UserIdSchema.nullable().optional(),
  })
  .refine(
    (update) =>
      update.stage !== undefined ||
      update.notes !== undefined ||
      update.assignedToUserId !== undefined,
    { message: "Provide at least one of stage, notes or assignedToUserId" },
  );
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>;
