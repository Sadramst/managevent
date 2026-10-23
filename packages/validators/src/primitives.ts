import { z } from "zod";

/**
 * 31-character safe alphabet (excludes `0`, `1`, `i`, `l`, `o`) per `WEBSITE.md` §B6.1.
 */
export const SAFE_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz" as const;

/**
 * Non-negative integer cents in AUD (`amountCents >= 0`). Never floats.
 */
export const CentsSchema = z.number().int().min(0);

/**
 * Signed integer cents in AUD (used for price deltas in recommendations).
 */
export const SignedCentsSchema = z.number().int();

/**
 * Currency code (currently always AUD per ADR-0006).
 */
export const CurrencySchema = z.literal("AUD");

/**
 * Australian phone number validator (accepts E.164 `+61[23478]XXXXXXXX` or domestic `0[23478]XXXXXXXX`
 * with optional spaces/hyphens, normalized by stripping whitespace/hyphens).
 */
export const AuPhoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      const compact = val.replace(/[\s-]/g, "");
      return /^(\+61[23478]\d{8}|0[23478]\d{8})$/.test(compact);
    },
    { message: "Must be a valid Australian phone number (+61... or 04...)" },
  );

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

/**
 * Validates an 11-digit Australian Business Number (ABN) using the official ATO modulus-89 algorithm.
 *
 * @param input - ABN string (spaces allowed).
 * @returns `true` if the ABN has 11 digits and passes modulus-89 check.
 */
export function validateAbnChecksum(input: string): boolean {
  const digits = input.replace(/\s+/g, "");
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }
  const nums = digits.split("").map((d) => Number.parseInt(d, 10));
  const first = nums[0];
  if (first === undefined || first === 0) {
    return false;
  }
  nums[0] = first - 1;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += (nums[i] ?? 0) * (ABN_WEIGHTS[i] ?? 0);
  }
  return sum % 89 === 0;
}

/**
 * Australian Business Number (ABN) schema enforcing 11 digits and official ATO modulus-89 checksum.
 */
export const AbnSchema = z.string().trim().refine(validateAbnChecksum, {
  message: "Invalid Australian Business Number (must be 11 digits and pass ATO checksum)",
});

/**
 * IANA time zone identifier schema (e.g. `Australia/Perth`, `Australia/Sydney`).
 */
export const IanaTimeZoneSchema = z
  .string()
  .min(3)
  .refine(
    (tz) => {
      if (!/^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/.test(tz) && tz !== "UTC") {
        return false;
      }
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid IANA time zone identifier" },
  );

/**
 * All configured platform locales (`en` and `fa` live; `ar`, `zh`, `hi` configured).
 */
export const LocaleSchema = z.enum(["en", "fa", "ar", "zh", "hi"]);

/**
 * Currently enabled live locales (`en` and `fa`).
 */
export const EnabledLocaleSchema = z.enum(["en", "fa"]);

/**
 * Standard URL slug (`lowercase-alphanumeric-with-hyphens`).
 */
export const SlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

/**
 * Invitation `eventSlug`: human-readable words plus a suffix from the 31-character safe alphabet (`no 0 1 i l o`) (`WEBSITE.md` §B6.1, e.g. `sara-ali-aghd-7kq`).
 */
export const SafeEventSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*-[23456789abcdefghjkmnpqrstuvwxyz]{3,16}$/,
    "Event slug must be lowercase words ending with a 3-16 character safe-alphabet suffix (no 0, 1, i, l, o)",
  );

/**
 * Guest token format `{readableName}-{suffix}` where suffix is 6+ characters from the 31-char safe alphabet (`WEBSITE.md` §B6.1).
 */
export const GuestTokenSchema = z
  .string()
  .min(8)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*-[23456789abcdefghjkmnpqrstuvwxyz]{6,16}$/,
    "Guest token must end with a 6-16 character safe-alphabet suffix",
  );

/**
 * Builds a Zod schema for a prefixed UUIDv7 identifier (e.g. `evt_0192...`).
 */
export function prefixedIdSchema<P extends string>(prefix: P) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${escaped}[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
  );
  return z.string().regex(pattern, `Must be a valid ${prefix} UUIDv7 identifier`);
}

export const UserIdSchema = prefixedIdSchema("usr_");
export const OrganisationIdSchema = prefixedIdSchema("org_");
export const MembershipIdSchema = prefixedIdSchema("mem_");
export const LeadIdSchema = prefixedIdSchema("lead_");
export const BuilderSessionIdSchema = prefixedIdSchema("bld_");
export const EstimateIdSchema = prefixedIdSchema("est_");
export const EventIdSchema = prefixedIdSchema("evt_");
export const SubEventIdSchema = prefixedIdSchema("sub_");
export const CoHostIdSchema = prefixedIdSchema("coh_");
export const InvitationIdSchema = prefixedIdSchema("inv_");
export const PartyIdSchema = prefixedIdSchema("pty_");
export const GuestIdSchema = prefixedIdSchema("gst_");
export const RsvpIdSchema = prefixedIdSchema("rsvp_");
export const EventHeadcountIdSchema = prefixedIdSchema("hc_");
export const PassIdSchema = prefixedIdSchema("pass_");
export const LegacySlugIdSchema = prefixedIdSchema("lgs_");
export const OrderIdSchema = prefixedIdSchema("ord_");
export const OrderLineIdSchema = prefixedIdSchema("oln_");
export const RecommendationSetIdSchema = prefixedIdSchema("rec_");
export const PaymentIdSchema = prefixedIdSchema("pay_");
export const TaxInvoiceIdSchema = prefixedIdSchema("txi_");
export const VenueIdSchema = prefixedIdSchema("ven_");
export const PackageIdSchema = prefixedIdSchema("pkg_");
export const ServiceIdSchema = prefixedIdSchema("svc_");
export const VendorServiceIdSchema = prefixedIdSchema("vsv_");
export const BookingIdSchema = prefixedIdSchema("bkg_");
export const InventoryItemIdSchema = prefixedIdSchema("itm_");
export const MediaAssetIdSchema = prefixedIdSchema("med_");
export const MessageIdSchema = prefixedIdSchema("msg_");
export const CampaignIdSchema = prefixedIdSchema("cmp_");
export const AuditLogIdSchema = prefixedIdSchema("aud_");
export const ConsentRecordIdSchema = prefixedIdSchema("cns_");
export const CrewRosterIdSchema = prefixedIdSchema("rst_");
export const ScanEventIdSchema = prefixedIdSchema("scn_");

// ─── Domain Enums ───────────────────────────────────────────────────────────

export const RoleEnum = z.enum([
  "CUSTOMER_HOST",
  "GUEST",
  "VENDOR",
  "PLANNER_STAFF",
  "CHECKIN_CREW",
  "SUPER_ADMIN",
]);

export const CeremonyFamilyEnum = z.enum(["CELEBRATION", "CULTURAL", "CORPORATE", "SOLEMN"]);

export const ExperienceModeEnum = z.enum(["CELEBRATION", "MEMORIAL"]);

export const EventStatusEnum = z.enum([
  "DRAFT",
  "ENQUIRY",
  "PROPOSAL",
  "BOOKED",
  "PLANNING",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const LeadStageEnum = z.enum(["NEW", "QUALIFIED", "PROPOSAL_SENT", "BOOKED", "LOST"]);

export const LeadSourceEnum = z.enum([
  "BUILDER",
  "CONTACT_FORM",
  "BOOK_CONSULT",
  "WHATSAPP",
  "PHONE",
  "INVITATION_BRIDGE",
  "REFERRAL",
  "OTHER",
]);

export const RsvpStatusEnum = z.enum(["PENDING", "YES", "NO", "MAYBE"]);

export const DietaryTagEnum = z.enum([
  "HALAL",
  "VEGETARIAN",
  "VEGAN",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
  "KOSHER",
  "NONE",
]);

export const AllergySeverityEnum = z.enum(["MILD", "MODERATE", "SEVERE_ANAPHYLAXIS"]);

export const CoHostRoleEnum = z.enum(["OWNER", "EDITOR", "VIEWER"]);

export const InvitationPlanEnum = z.enum(["FREE", "PREMIUM", "AGENCY"]);

export const PaymentStatusEnum = z.enum([
  "PENDING",
  "REQUIRES_ACTION",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const PaymentKindEnum = z.enum([
  "DEPOSIT",
  "MILESTONE",
  "BALANCE",
  "INVITATION_PASS",
  "ADD_ON",
  "REFUND",
]);

export const PaymentMethodEnum = z.enum([
  "CARD",
  "APPLE_PAY",
  "GOOGLE_PAY",
  "AFTERPAY",
  "BANK_TRANSFER",
]);

export const VendorStatusEnum = z.enum([
  "APPLIED",
  "PENDING_DOCS",
  "UNDER_REVIEW",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
]);

export const DocumentTypeEnum = z.enum([
  "PUBLIC_LIABILITY",
  "FOOD_SAFETY",
  "RSA",
  "LIQUOR_LICENCE",
  "WWCC",
  "ABN_EVIDENCE",
  "OTHER",
]);

export const BookingStatusEnum = z.enum([
  "REQUESTED",
  "QUOTED",
  "ACCEPTED",
  "DECLINED",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
]);

export const MediaModerationEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const MessageChannelEnum = z.enum(["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"]);

export const OrderStatusEnum = z.enum([
  "DRAFT",
  "PROPOSED",
  "ACCEPTED",
  "LOCKED",
  "COMPLETED",
  "CANCELLED",
]);

export const OrderLineKindEnum = z.enum(["SERVICE", "PACKAGE", "HIRE", "VENDOR_BOOKING", "FEE"]);

export const OrderLineUnitEnum = z.enum(["GUEST", "TABLE", "HOUR", "ITEM", "FIXED"]);

export const RecommendationStatusEnum = z.enum(["OPEN", "APPLIED", "DISMISSED", "SUPERSEDED"]);

export const WellModeEnum = z.enum(["NONE", "WISHING_WELL", "TRIBUTE_BOOK"]);

export const ServiceTierEnum = z.enum(["ESSENTIAL", "SIGNATURE", "LUXE"]);

export const TravelZoneEnum = z.enum(["METRO", "OUTER_METRO", "REGIONAL"]);

export const CELEBRATION_THEME_IDS = [
  "royal-ivory",
  "midnight-celestial",
  "emerald-botanic",
  "persian-azure",
  "alabaster-platinum",
] as const;

export const MEMORIAL_THEME_IDS = ["memorial-alabaster", "memorial-slate"] as const;

export const InvitationThemeIdEnum = z.enum([...CELEBRATION_THEME_IDS, ...MEMORIAL_THEME_IDS]);
