/**
 * @managevent/types
 *
 * Shared domain types inferred from `@managevent/validators`, branded ID types,
 * and tiny runtime type guards for client and server use.
 */
import type { z } from "zod";
import type {
  AllergySeverityEnum,
  ApiErrorSchema,
  BookingStatusEnum,
  BuilderEstimateCategoryBreakdownSchema,
  BuilderEstimateRequestSchema,
  BuilderEstimateResponseSchema,
  BuilderServiceCategoryEnum,
  BuilderServiceSelectionSchema,
  BuilderSessionSaveSchema,
  CeremonyFamilyEnum,
  CoHostRoleEnum,
  ContentCeremonySchema,
  ContentCitySchema,
  ContentPackageSchema,
  ContentRoutesSchema,
  ContentStatusEnum,
  ContentTestimonialItemSchema,
  ContentVenueItemSchema,
  CurrencySchema,
  DietaryTagEnum,
  DocumentTypeEnum,
  EnabledLocaleSchema,
  EventCreateSchema,
  EventResponseSchema,
  EventStatusEnum,
  EventUpdateSchema,
  ExperienceModeEnum,
  GuestCreateSchema,
  GuestResponseSchema,
  GuestRsvpItemSchema,
  HealthResponseSchema,
  InvitationCreateSchema,
  InvitationPlanEnum,
  InvitationResponseSchema,
  InvitationThemeIdEnum,
  InvitationUpdateSchema,
  LeadCreateSchema,
  LeadResponseSchema,
  LeadSourceEnum,
  LeadStageEnum,
  LocaleSchema,
  LocalizedTextSchema,
  MediaModerationEnum,
  MessageChannelEnum,
  OrderApplyRecommendationSchema,
  OrderCreateSchema,
  OrderLineInputSchema,
  OrderLineKindEnum,
  OrderLineSchema,
  OrderLineUnitEnum,
  OrderResponseSchema,
  OrderStatusEnum,
  PartyCreateSchema,
  PartyResponseSchema,
  PassResponseSchema,
  PaymentCreateSchema,
  PaymentKindEnum,
  PaymentMethodEnum,
  PaymentResponseSchema,
  PaymentStatusEnum,
  RecommendationItemSchema,
  RecommendationSetResponseSchema,
  RecommendationStatusEnum,
  RoleEnum,
  RsvpResponseSchema,
  RsvpStatusEnum,
  RsvpSubmitSchema,
  ScanEventCreateSchema,
  ScanEventResponseSchema,
  ServiceTierEnum,
  SubEventInputSchema,
  TaxCodeEnum,
  TaxInvoiceLineSchema,
  TaxInvoiceSchema,
  TravelZoneEnum,
  UtmSchema,
  VendorStatusEnum,
  VenueTypeEnum,
  WellModeEnum,
} from "@managevent/validators";

declare const __brand: unique symbol;

/**
 * Compile-time branded type helper.
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Branded integer cents in AUD.
 */
export type AudCents = Brand<number, "AudCents">;

/**
 * Branded prefixed UUIDv7 entity IDs.
 */
export type BrandedId<P extends string> = Brand<`${P}${string}`, `Id:${P}`>;

export type UserId = BrandedId<"usr_">;
export type OrganisationId = BrandedId<"org_">;
export type MembershipId = BrandedId<"mem_">;
export type LeadId = BrandedId<"lead_">;
export type BuilderSessionId = BrandedId<"bld_">;
export type EstimateId = BrandedId<"est_">;
export type EventId = BrandedId<"evt_">;
export type SubEventId = BrandedId<"sub_">;
export type CoHostId = BrandedId<"coh_">;
export type InvitationId = BrandedId<"inv_">;
export type PartyId = BrandedId<"pty_">;
export type GuestId = BrandedId<"gst_">;
export type RsvpId = BrandedId<"rsvp_">;
export type EventHeadcountId = BrandedId<"hc_">;
export type PassId = BrandedId<"pass_">;
export type LegacySlugId = BrandedId<"lgs_">;
export type OrderId = BrandedId<"ord_">;
export type OrderLineId = BrandedId<"oln_">;
export type RecommendationSetId = BrandedId<"rec_">;
export type PaymentId = BrandedId<"pay_">;
export type TaxInvoiceId = BrandedId<"txi_">;
export type VenueId = BrandedId<"ven_">;
export type PackageId = BrandedId<"pkg_">;
export type ServiceId = BrandedId<"svc_">;
export type VendorServiceId = BrandedId<"vsv_">;
export type BookingId = BrandedId<"bkg_">;
export type InventoryItemId = BrandedId<"itm_">;
export type MediaAssetId = BrandedId<"med_">;
export type MessageId = BrandedId<"msg_">;
export type CampaignId = BrandedId<"cmp_">;
export type AuditLogId = BrandedId<"aud_">;
export type ConsentRecordId = BrandedId<"cns_">;
export type CrewRosterId = BrandedId<"rst_">;
export type ScanEventId = BrandedId<"scn_">;

const UUID_V7_TAIL_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Runtime type guard that narrows an unknown string to a branded prefixed UUIDv7 ID.
 */
export function isBrandedId<P extends string>(value: unknown, prefix: P): value is BrandedId<P> {
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    return false;
  }
  return UUID_V7_TAIL_REGEX.test(value.slice(prefix.length));
}

/**
 * Asserts and returns a branded prefixed UUIDv7 ID, throwing a TypeError if invalid.
 */
export function asBrandedId<P extends string>(value: string, prefix: P): BrandedId<P> {
  if (!isBrandedId(value, prefix)) {
    throw new TypeError(`Invalid ${prefix} UUIDv7 identifier: ${value}`);
  }
  return value;
}

/**
 * Type guard checking if a number is a valid non-negative integer cent amount.
 */
export function isAudCents(value: unknown): value is AudCents {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// ─── Inferred Enums & Primitives ────────────────────────────────────────────

export type Currency = z.infer<typeof CurrencySchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type EnabledLocale = z.infer<typeof EnabledLocaleSchema>;
export type Role = z.infer<typeof RoleEnum>;
export type CeremonyFamily = z.infer<typeof CeremonyFamilyEnum>;
export type ExperienceMode = z.infer<typeof ExperienceModeEnum>;
export type EventStatus = z.infer<typeof EventStatusEnum>;
export type LeadStage = z.infer<typeof LeadStageEnum>;
export type LeadSource = z.infer<typeof LeadSourceEnum>;
export type RsvpStatus = z.infer<typeof RsvpStatusEnum>;
export type DietaryTag = z.infer<typeof DietaryTagEnum>;
export type AllergySeverity = z.infer<typeof AllergySeverityEnum>;
export type CoHostRole = z.infer<typeof CoHostRoleEnum>;
export type InvitationPlan = z.infer<typeof InvitationPlanEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type PaymentKind = z.infer<typeof PaymentKindEnum>;
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export type VendorStatus = z.infer<typeof VendorStatusEnum>;
export type DocumentType = z.infer<typeof DocumentTypeEnum>;
export type BookingStatus = z.infer<typeof BookingStatusEnum>;
export type MediaModeration = z.infer<typeof MediaModerationEnum>;
export type MessageChannel = z.infer<typeof MessageChannelEnum>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type OrderLineKind = z.infer<typeof OrderLineKindEnum>;
export type OrderLineUnit = z.infer<typeof OrderLineUnitEnum>;
export type RecommendationStatus = z.infer<typeof RecommendationStatusEnum>;
export type WellMode = z.infer<typeof WellModeEnum>;
export type ServiceTier = z.infer<typeof ServiceTierEnum>;
export type TravelZone = z.infer<typeof TravelZoneEnum>;
export type InvitationThemeId = z.infer<typeof InvitationThemeIdEnum>;
export type TaxCode = z.infer<typeof TaxCodeEnum>;

// ─── Inferred Content Types ─────────────────────────────────────────────────

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type ContentStatus = z.infer<typeof ContentStatusEnum>;
export type VenueType = z.infer<typeof VenueTypeEnum>;
export type ContentCeremony = z.infer<typeof ContentCeremonySchema>;
export type ContentCity = z.infer<typeof ContentCitySchema>;
export type ContentPackage = z.infer<typeof ContentPackageSchema>;
export type ContentRoutes = z.infer<typeof ContentRoutesSchema>;
export type ContentTestimonialItem = z.infer<typeof ContentTestimonialItemSchema>;
export type ContentVenueItem = z.infer<typeof ContentVenueItemSchema>;

// ─── Inferred API Input & Output Types ──────────────────────────────────────

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type Utm = z.infer<typeof UtmSchema>;
export type LeadCreateInput = z.input<typeof LeadCreateSchema>;
export type LeadCreate = z.infer<typeof LeadCreateSchema>;
export type LeadResponse = z.infer<typeof LeadResponseSchema>;

export type BuilderServiceCategory = z.infer<typeof BuilderServiceCategoryEnum>;
export type BuilderServiceSelection = z.infer<typeof BuilderServiceSelectionSchema>;
export type BuilderEstimateRequestInput = z.input<typeof BuilderEstimateRequestSchema>;
export type BuilderEstimateRequest = z.infer<typeof BuilderEstimateRequestSchema>;
export type BuilderEstimateCategoryBreakdown = z.infer<
  typeof BuilderEstimateCategoryBreakdownSchema
>;
export type BuilderEstimateResponse = z.infer<typeof BuilderEstimateResponseSchema>;
export type BuilderSessionSave = z.infer<typeof BuilderSessionSaveSchema>;

export type SubEventInput = z.infer<typeof SubEventInputSchema>;
export type EventCreateInput = z.input<typeof EventCreateSchema>;
export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;

export type InvitationCreateInput = z.input<typeof InvitationCreateSchema>;
export type InvitationCreate = z.infer<typeof InvitationCreateSchema>;
export type InvitationUpdate = z.infer<typeof InvitationUpdateSchema>;
export type InvitationResponse = z.infer<typeof InvitationResponseSchema>;

export type PartyCreateInput = z.input<typeof PartyCreateSchema>;
export type PartyCreate = z.infer<typeof PartyCreateSchema>;
export type PartyResponse = z.infer<typeof PartyResponseSchema>;

export type GuestCreateInput = z.input<typeof GuestCreateSchema>;
export type GuestCreate = z.infer<typeof GuestCreateSchema>;
export type GuestResponse = z.infer<typeof GuestResponseSchema>;

export type GuestRsvpItem = z.infer<typeof GuestRsvpItemSchema>;
export type RsvpSubmitInput = z.input<typeof RsvpSubmitSchema>;
export type RsvpSubmit = z.infer<typeof RsvpSubmitSchema>;
export type RsvpResponse = z.infer<typeof RsvpResponseSchema>;

export type PassResponse = z.infer<typeof PassResponseSchema>;
export type ScanEventCreate = z.infer<typeof ScanEventCreateSchema>;
export type ScanEventResponse = z.infer<typeof ScanEventResponseSchema>;

export type OrderLineInput = z.infer<typeof OrderLineInputSchema>;
export type OrderLine = z.infer<typeof OrderLineSchema>;
export type OrderCreate = z.infer<typeof OrderCreateSchema>;
export type OrderApplyRecommendation = z.infer<typeof OrderApplyRecommendationSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type RecommendationSetResponse = z.infer<typeof RecommendationSetResponseSchema>;

export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
export type TaxInvoiceLine = z.infer<typeof TaxInvoiceLineSchema>;
export type TaxInvoice = z.infer<typeof TaxInvoiceSchema>;
