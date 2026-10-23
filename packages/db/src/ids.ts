import { randomBytes } from "node:crypto";

/**
 * Canonical entity ID prefixes as specified in `packages/db/DATA_MODEL.md` and ADR-0006.
 */
export const ID_PREFIXES = {
  user: "usr_",
  organisation: "org_",
  membership: "mem_",
  lead: "lead_",
  builderSession: "bld_",
  estimate: "est_",
  event: "evt_",
  subEvent: "sub_",
  coHost: "coh_",
  invitation: "inv_",
  party: "pty_",
  guest: "gst_",
  rsvp: "rsvp_",
  eventHeadcount: "hc_",
  pass: "pass_",
  legacySlug: "lgs_",
  order: "ord_",
  orderLine: "oln_",
  recommendationSet: "rec_",
  payment: "pay_",
  paymentSchedule: "psc_",
  transfer: "trf_",
  taxInvoice: "txi_",
  refund: "ref_",
  venue: "ven_",
  package: "pkg_",
  service: "svc_",
  priceList: "prc_",
  vendorService: "vsv_",
  vendorDocument: "vdc_",
  availabilityBlock: "avb_",
  booking: "bkg_",
  inventoryItem: "itm_",
  inventoryReservation: "irs_",
  task: "tsk_",
  runSheet: "rsh_",
  floorPlan: "flp_",
  crewRoster: "rst_",
  scanEvent: "scn_",
  mediaAsset: "med_",
  wellEntry: "wel_",
  message: "msg_",
  campaign: "cmp_",
  auditLog: "aud_",
  consentRecord: "cns_",
  unsubscribe: "uns_",
} as const;

export type EntityKey = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[EntityKey];
export type PrefixedId<P extends IdPrefix = IdPrefix> = `${P}${string}`;

let lastTimestampMs = 0;
let monotonicCounter = 0;

/**
 * Generates an RFC 9562 UUIDv7 string (k-sortable, 48-bit Unix millisecond timestamp + monotonic sub-ms sequence).
 *
 * @param nowMs - Optional timestamp in milliseconds since Unix epoch (defaults to `Date.now()`).
 * @returns Lowercase standard 36-char UUIDv7 string.
 */
export function generateUuidV7(nowMs: number = Date.now()): string {
  const ts = Math.max(0, Math.floor(nowMs));
  const bytes = randomBytes(16);

  if (ts === lastTimestampMs) {
    monotonicCounter = (monotonicCounter + 1) & 0x0fff;
  } else {
    lastTimestampMs = ts;
    monotonicCounter = (((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0)) & 0x0fff;
  }

  // 48-bit big-endian timestamp in bytes 0..5
  const hi16 = Math.floor(ts / 0x100000000);
  const lo32 = ts >>> 0;
  bytes[0] = (hi16 >>> 8) & 0xff;
  bytes[1] = hi16 & 0xff;
  bytes[2] = (lo32 >>> 24) & 0xff;
  bytes[3] = (lo32 >>> 16) & 0xff;
  bytes[4] = (lo32 >>> 8) & 0xff;
  bytes[5] = lo32 & 0xff;

  // Version 7 (0111) + 12-bit monotonic counter in bytes 6..7
  bytes[6] = 0x70 | ((monotonicCounter >>> 8) & 0x0f);
  bytes[7] = monotonicCounter & 0xff;

  // Variant 10xx in byte 8
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generates a prefixed UUIDv7 identifier for a Managevent domain entity.
 *
 * @param prefixOrEntity - Either the prefix (e.g. `"evt_"`) or the entity key (e.g. `"event"`).
 * @param nowMs - Optional millisecond timestamp override for deterministic tests.
 * @returns Prefixed UUIDv7 string, e.g. `evt_0192b4...`.
 */
export function generateId<K extends EntityKey>(
  prefixOrEntity: K,
  nowMs?: number,
): PrefixedId<(typeof ID_PREFIXES)[K]>;
export function generateId<P extends IdPrefix>(prefixOrEntity: P, nowMs?: number): PrefixedId<P>;
export function generateId(prefixOrEntity: EntityKey | IdPrefix, nowMs?: number): string {
  const prefix =
    prefixOrEntity in ID_PREFIXES
      ? ID_PREFIXES[prefixOrEntity as EntityKey]
      : (prefixOrEntity as IdPrefix);
  return `${prefix}${generateUuidV7(nowMs)}`;
}

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const VALID_PREFIX_LIST = Object.values(ID_PREFIXES);

/**
 * Checks whether a string is a valid prefixed UUIDv7 identifier.
 *
 * @param value - Candidate ID string.
 * @param expectedPrefix - Optional specific prefix to require (e.g. `"evt_"`).
 */
export function isValidPrefixedId(value: string, expectedPrefix?: IdPrefix): boolean {
  if (expectedPrefix) {
    if (!value.startsWith(expectedPrefix)) return false;
    return UUID_V7_REGEX.test(value.slice(expectedPrefix.length));
  }

  for (const prefix of VALID_PREFIX_LIST) {
    if (value.startsWith(prefix)) {
      return UUID_V7_REGEX.test(value.slice(prefix.length));
    }
  }
  return false;
}

/**
 * Extracts the embedded creation `Date` from a prefixed UUIDv7 ID.
 *
 * @param prefixedId - A valid Managevent prefixed UUIDv7 ID.
 * @returns The `Date` encoded in the top 48 bits, or `null` if invalid.
 */
export function extractIdTimestamp(prefixedId: string): Date | null {
  if (!isValidPrefixedId(prefixedId)) return null;
  const underscoreIndex = prefixedId.indexOf("_");
  const uuid = prefixedId.slice(underscoreIndex + 1);
  const hexTs = uuid.slice(0, 8) + uuid.slice(9, 13);
  const ms = Number.parseInt(hexTs, 16);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}
