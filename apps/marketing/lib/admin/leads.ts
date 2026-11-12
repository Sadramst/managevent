/**
 * Pure helpers for the staff console: who counts as staff, lead stage moves, the inbox query
 * string, and Perth-time formatting. No I/O, so everything here is unit tested.
 */
import { type AdminPagesCopy, getExperienceMode, PERTH_UTC_OFFSET_MINUTES } from "@managevent/i18n";
import type { LeadResponse, LeadStage } from "@managevent/types";
import { LeadIdSchema, LeadStageEnum } from "@managevent/validators";

/** Roles allowed into the console. The API enforces the same pair on every `/v1/leads` route. */
export const STAFF_ROLES = ["PLANNER_STAFF", "SUPER_ADMIN"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaff(roles: readonly string[]): boolean {
  return roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
}

/** The staff role to show next to the name: the administrator role wins when both are held. */
export function primaryStaffRole(roles: readonly string[]): StaffRole | null {
  if (roles.includes("SUPER_ADMIN")) return "SUPER_ADMIN";
  if (roles.includes("PLANNER_STAFF")) return "PLANNER_STAFF";
  return null;
}

/** Pipeline order, as in `LeadStageEnum`. */
export const LEAD_STAGES: readonly LeadStage[] = LeadStageEnum.options;

/**
 * The moves offered from each stage, most likely next step first: forward one step, back one
 * step to correct a mistake, or out to `LOST`. A lost enquiry can only be reopened as new.
 */
const LEAD_STAGE_MOVES: Readonly<Record<LeadStage, readonly LeadStage[]>> = {
  NEW: ["QUALIFIED", "LOST"],
  QUALIFIED: ["PROPOSAL_SENT", "NEW", "LOST"],
  PROPOSAL_SENT: ["BOOKED", "QUALIFIED", "LOST"],
  BOOKED: ["PROPOSAL_SENT", "LOST"],
  LOST: ["NEW"],
};

export function nextLeadStages(stage: LeadStage): readonly LeadStage[] {
  return LEAD_STAGE_MOVES[stage];
}

export function canMoveLeadStage(from: LeadStage, to: LeadStage): boolean {
  return LEAD_STAGE_MOVES[from].includes(to);
}

/** Brand badge classes per stage. The label carries the meaning; colour only supports it. */
export function stageBadgeClass(stage: LeadStage): string {
  switch (stage) {
    case "NEW":
      return "badge badge-solid";
    case "QUALIFIED":
      return "badge";
    case "PROPOSAL_SENT":
      return "badge badge-warning";
    case "BOOKED":
      return "badge badge-success";
    case "LOST":
      return "badge badge-neutral";
  }
}

type SearchParam = string | string[] | undefined;

const single = (value: SearchParam): string | undefined =>
  typeof value === "string" ? value : undefined;

/** `?stage=` when it names a real stage; anything else means "all". */
export function parseStageFilter(value: SearchParam): LeadStage | undefined {
  const parsed = LeadStageEnum.safeParse(single(value));
  return parsed.success ? parsed.data : undefined;
}

export const SEARCH_MAX_LENGTH = 80;

/** `?q=` trimmed and capped at the API's limit; empty means no search. */
export function parseSearchQuery(value: SearchParam): string | undefined {
  const trimmed = single(value)?.trim().slice(0, SEARCH_MAX_LENGTH).trim();
  return trimmed ? trimmed : undefined;
}

/** `?cursor=` when it is a lead id; a malformed cursor is ignored rather than sent to the API. */
export function parseLeadCursor(value: SearchParam): string | undefined {
  const parsed = LeadIdSchema.safeParse(single(value));
  return parsed.success ? parsed.data : undefined;
}

export interface InboxFilter {
  stage?: LeadStage | undefined;
  q?: string | undefined;
  cursor?: string | undefined;
}

/** The inbox URL for a filter. Parameters keep a fixed order so links are stable. */
export function inboxHref(filter: InboxFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.stage) params.set("stage", filter.stage);
  if (filter.q) params.set("q", filter.q);
  if (filter.cursor) params.set("cursor", filter.cursor);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export function leadHref(leadId: string): string {
  return `/admin/leads/${encodeURIComponent(leadId)}`;
}

/**
 * Where to go after signing in. Only paths inside the console are honoured, so `?next=` can
 * never send someone to another site or back to the sign-in page itself.
 */
export function safeAdminNext(next: SearchParam): string {
  const value = single(next);
  if (!value) return "/admin";
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return "/admin";
  if (value.includes("\\") || value.includes("//") || /[\u0000-\u001f]/.test(value)) {
    return "/admin";
  }
  // `/admin/../contact` starts with the right letters but leaves the console once the browser
  // resolves it. Dot segments are refused in the path, however they are spelled.
  const path = value.split(/[?#]/)[0] ?? "";
  if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(path) || /%2f|%5c/i.test(path)) return "/admin";
  if (/^\/admin\/sign-(?:in|out)(?:[/?#]|$)/.test(value)) return "/admin";
  return value;
}

export const SIGN_IN_PATH = "/admin/sign-in";

export type SignInReason = "staff" | "session" | "signed-out";

/**
 * The sign-in URL, remembering where the person was going (`next`) and why they were sent
 * there: `staff` for a signed-in account that is not staff, `session` for an expired session,
 * `signed-out` after signing out.
 */
export function signInHref(options: { next?: string; reason?: SignInReason } = {}): string {
  const params = new URLSearchParams();
  if (options.reason) params.set("reason", options.reason);
  const next = safeAdminNext(options.next);
  if (next !== "/admin") params.set("next", next);
  const query = params.toString();
  return query ? `${SIGN_IN_PATH}?${query}` : SIGN_IN_PATH;
}

export function parseSignInReason(value: SearchParam): SignInReason | undefined {
  const reason = single(value);
  return reason === "staff" || reason === "session" || reason === "signed-out" ? reason : undefined;
}

function perthParts(iso: string) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const shifted = new Date(ms + PERTH_UTC_OFFSET_MINUTES * 60_000);
  return {
    day: String(shifted.getUTCDate()).padStart(2, "0"),
    month: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    year: String(shifted.getUTCFullYear()),
    hours: shifted.getUTCHours(),
    minutes: String(shifted.getUTCMinutes()).padStart(2, "0"),
  };
}

/** `DD/MM/YYYY` in Perth time (AWST, UTC+8, no daylight saving). No `Intl`, so it is stable. */
export function formatPerthDate(iso: string): string {
  const parts = perthParts(iso);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : "";
}

/** `DD/MM/YYYY, h:mm am` in Perth time. */
export function formatPerthDateTime(iso: string): string {
  const parts = perthParts(iso);
  if (!parts) return "";
  const period = parts.hours >= 12 ? "pm" : "am";
  const hour12 = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  return `${parts.day}/${parts.month}/${parts.year}, ${hour12}:${parts.minutes} ${period}`;
}

/** `birthday-milestone` → `Birthday milestone`, for an occasion that has no page of its own. */
export function humaniseSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

/** A `tel:` link for a phone number as typed: digits and a leading `+` only. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

export type StageCounts = Readonly<Record<LeadStage, number>> & { readonly all: number };

/**
 * Per-stage totals from one unfiltered page of leads. They are only exact when that page holds
 * every lead, so an incomplete page yields `null` and the tabs show no numbers.
 */
export function stageCounts(
  page: { items: readonly Pick<LeadResponse, "stage">[]; nextCursor: string | null } | null,
): StageCounts | null {
  if (!page || page.nextCursor !== null) return null;
  const counts: Record<LeadStage, number> = {
    NEW: 0,
    QUALIFIED: 0,
    PROPOSAL_SENT: 0,
    BOOKED: 0,
    LOST: 0,
  };
  for (const { stage } of page.items) counts[stage] += 1;
  return { ...counts, all: page.items.length };
}

/** One inbox row, already formatted, so the same shape renders on the server and after "Load more". */
export interface InboxRow {
  id: string;
  href: string;
  received: string;
  receivedIso: string;
  name: string;
  email: string;
  ceremony: string;
  /** A funeral, memorial, celebration of life or wake: staff reply in a quieter tone. */
  memorial: boolean;
  /** `DD/MM/YYYY`, or an empty string when no date was given. */
  eventDate: string;
  dateFlexible: boolean;
  guests: string;
  area: string;
  stage: LeadStage;
  stageLabel: string;
  stageClass: string;
}

/** The occasion's name from `/content`, or the slug in words when it has no page. */
export function ceremonyLabel(
  slug: string | null,
  ceremonyNames: Readonly<Record<string, string>>,
): string {
  if (!slug) return "";
  return ceremonyNames[slug] ?? humaniseSlug(slug);
}

/** Memorial Mode for an enquiry, always through the shared helper. */
export function isMemorialEnquiry(ceremonySlug: string | null): boolean {
  return getExperienceMode({ ceremonySlug }) === "MEMORIAL";
}

export function toInboxRow(
  lead: LeadResponse,
  copy: AdminPagesCopy,
  ceremonyNames: Readonly<Record<string, string>>,
): InboxRow {
  return {
    id: lead.id,
    href: leadHref(lead.id),
    received: formatPerthDate(lead.createdAt),
    receivedIso: lead.createdAt,
    name: lead.name,
    email: lead.email,
    ceremony: ceremonyLabel(lead.ceremonySlug, ceremonyNames),
    memorial: isMemorialEnquiry(lead.ceremonySlug),
    eventDate: lead.eventDate ? formatPerthDate(lead.eventDate) : "",
    dateFlexible: lead.dateFlexible,
    guests: lead.guestEstimate === null ? "" : String(lead.guestEstimate),
    area: lead.area ?? "",
    stage: lead.stage,
    stageLabel: copy.stages[lead.stage],
    stageClass: stageBadgeClass(lead.stage),
  };
}
