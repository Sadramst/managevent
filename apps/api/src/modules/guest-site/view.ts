/**
 * Pure mappers from database rows to guest-safe DTOs.
 *
 * Guest-safe rule: nothing built here carries another party, the token, an email, a phone, the
 * salt, plan internals, or an event/invitation/party id. Health values are never echoed back;
 * `healthOnFile` only says that something is stored.
 */
import type { Event, Invitation } from "@managevent/db";
import type { InvitationPlanEntitlements } from "@managevent/payments";
import {
  CELEBRATION_THEME_IDS,
  GateStyleEnum,
  type GuestInvitationView,
  type GuestMemberView,
  type GuestPartyView,
  type GuestPass,
  type GuestRsvpView,
  type GuestWellView,
  type GuestWish,
  INVITATION_TEMPLATES,
  type InvitationContent,
  InvitationContentSchema,
  InvitationThemeIdEnum,
  MEMORIAL_FORBIDDEN_WELL_FIELDS,
  MEMORIAL_THEME_IDS,
  type RsvpConfig,
  RsvpConfigSchema,
  type WellConfig,
  WellConfigSchema,
} from "@managevent/validators";
import type { EventAccess } from "../../lib/access.js";
import { signPass } from "../../lib/guest-tokens.js";
import { fromLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime } from "../../lib/time.js";
import { readDietaryTags } from "../headcount/service.js";
import { DEFAULT_EVENT_DURATION_MS } from "./ics.js";
import type { PartyGuestRow, PartyLinkRow } from "./repo.js";

export type RsvpState = GuestRsvpView["state"];

/** The event in the shape the cross-module helpers (`syncPassesForParty`) expect. */
export function toAccessEvent(event: Event): EventAccess["event"] {
  return {
    id: event.id,
    ownerUserId: event.ownerUserId,
    title: fromLocalized(event.title),
    ceremonySlug: event.ceremonySlug,
    experienceMode: event.experienceMode,
    status: event.status,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeZone: event.timeZone,
  };
}

/**
 * Reads `Invitation.contentJson`. The API only ever stores validated content; if a row is
 * malformed anyway, the guest still gets a minimal invitation (title and hosts) instead of a 500.
 */
export function readInvitationContent(contentJson: unknown, eventTitle: string): InvitationContent {
  const parsed = InvitationContentSchema.safeParse(contentJson);
  if (parsed.success) return parsed.data;
  const title = eventTitle.trim().slice(0, 160) || "Invitation";
  return {
    version: 1,
    headline: title,
    subheadline: "",
    hosts: title,
    wording: "",
    story: [],
    schedule: [],
    venue: null,
    faq: [],
    coverImageUrl: null,
    galleryImageUrls: [],
    music: { enabled: false, url: null, title: null, rightsAttested: false },
  };
}

/**
 * Template, theme and gate style as the guest site may render them. A stored value outside the
 * catalogue falls back to the defaults of the template (or of the mode), and a memorial
 * invitation never gets a celebration theme or an animated gate, whatever the row says.
 */
export function readPresentation(
  invitation: Pick<Invitation, "templateSlug" | "themeId" | "gateStyle">,
  experienceMode: string,
): Pick<GuestInvitationView["invitation"], "templateSlug" | "themeId" | "gateStyle"> {
  const memorial = experienceMode === "MEMORIAL";
  const mode = memorial ? "MEMORIAL" : "CELEBRATION";
  const fallback = INVITATION_TEMPLATES.find((candidate) => candidate.mode === mode);
  const template =
    INVITATION_TEMPLATES.find(
      (candidate) => candidate.slug === invitation.templateSlug && candidate.mode === mode,
    ) ?? fallback;
  if (!template) throw new Error("The template catalogue has no template for this mode");

  const theme = InvitationThemeIdEnum.safeParse(invitation.themeId);
  const allowedThemes: readonly string[] = memorial ? MEMORIAL_THEME_IDS : CELEBRATION_THEME_IDS;
  const gate = GateStyleEnum.safeParse(invitation.gateStyle);
  return {
    templateSlug: template.slug,
    themeId:
      theme.success && allowedThemes.includes(theme.data) ? theme.data : template.defaultThemeId,
    gateStyle: memorial ? "plain-fade" : gate.success ? gate.data : template.defaultGateStyle,
  };
}

/** Reads `Invitation.rsvpConfigJson`. A memorial invitation never shows the celebratory song prompt. */
export function readRsvpConfig(rsvpConfigJson: unknown, experienceMode: string): RsvpConfig {
  const parsed = RsvpConfigSchema.safeParse(rsvpConfigJson ?? {});
  const config = parsed.success ? parsed.data : RsvpConfigSchema.parse({});
  if (experienceMode === "MEMORIAL" && config.songPrompt === "STANDARD") {
    return { ...config, songPrompt: "HIDDEN" };
  }
  return config;
}

/** The well block, or null when the invitation has none. Memorial wells never carry bank details. */
export function toWellView(
  invitation: Pick<Invitation, "wellMode" | "wellConfigJson">,
  experienceMode: string,
): GuestWellView {
  if (invitation.wellMode === "NONE") return null;
  const parsed = WellConfigSchema.safeParse(invitation.wellConfigJson ?? {});
  const config: WellConfig = parsed.success ? { ...parsed.data } : {};
  if (experienceMode === "MEMORIAL") {
    for (const field of MEMORIAL_FORBIDDEN_WELL_FIELDS) delete config[field];
  }
  return { mode: invitation.wellMode, ...config };
}

/** True when the guest has dietary, allergy or accessibility details stored. */
export function hasHealthOnFile(rsvp: PartyGuestRow["rsvp"]): boolean {
  if (!rsvp) return false;
  if (rsvp.allergyNotes || rsvp.accessibilityNotes || rsvp.allergySeverityEncrypted) return true;
  return readDietaryTags(rsvp.dietaryEncrypted).some((tag) => tag !== "NONE");
}

export function toMemberView(guest: PartyGuestRow): GuestMemberView {
  const status = guest.rsvp?.status ?? "PENDING";
  return {
    guestId: guest.id,
    name: fromLocalized(guest.name),
    isChild: guest.isChild,
    isPlusOne: guest.isPlusOne,
    status,
    respondedAt: guest.rsvp && status !== "PENDING" ? guest.rsvp.respondedAt.toISOString() : null,
    healthOnFile: hasHealthOnFile(guest.rsvp),
  };
}

export function toPartyView(party: PartyLinkRow): GuestPartyView {
  return {
    displayName: fromLocalized(party.displayName),
    maxSeats: Math.max(1, party.maxSeats),
    allowPlusOnes: party.allowPlusOnes,
    childrenAllowed: party.childrenAllowed,
    tableLabel: party.tableLabel,
    members: party.guests.map(toMemberView),
  };
}

/** The guest whose Rsvp row carries the party's song requests and message: first non-plus-one. */
export function findPrimaryGuest(guests: readonly PartyGuestRow[]): PartyGuestRow | null {
  return guests.find((guest) => !guest.isPlusOne) ?? guests[0] ?? null;
}

/**
 * `READ_ONLY` for demos and draft previews, `CLOSED` once the deadline has passed or the event has
 * started, otherwise `OPEN`.
 */
export function computeRsvpState(input: {
  demo: boolean;
  preview: boolean;
  rsvpDeadline: Date | null;
  startsAt: Date;
  now: Date;
}): RsvpState {
  if (input.demo || input.preview) return "READ_ONLY";
  if (isRsvpClosed(input)) return "CLOSED";
  return "OPEN";
}

export function isRsvpClosed(input: {
  rsvpDeadline: Date | null;
  startsAt: Date;
  now: Date;
}): boolean {
  const nowMs = input.now.getTime();
  if (input.rsvpDeadline && nowMs > input.rsvpDeadline.getTime()) return true;
  return nowMs >= input.startsAt.getTime();
}

export function toRsvpView(party: PartyLinkRow, state: RsvpState): GuestRsvpView {
  let lastRespondedAt: Date | null = null;
  for (const guest of party.guests) {
    if (!guest.rsvp || guest.rsvp.status === "PENDING") continue;
    if (!lastRespondedAt || guest.rsvp.respondedAt > lastRespondedAt) {
      lastRespondedAt = guest.rsvp.respondedAt;
    }
  }
  const primary = findPrimaryGuest(party.guests);
  return {
    state,
    hasResponded: lastRespondedAt !== null,
    lastRespondedAt: lastRespondedAt ? lastRespondedAt.toISOString() : null,
    seatsRemaining: Math.max(0, party.maxSeats - party.guests.length),
    songRequests: primary?.rsvp?.songRequests ?? [],
    messageToHost: primary?.rsvp?.messageToHost ?? null,
  };
}

/**
 * Live passes of the party's guests (attending guests, plus anyone checked in by hand at the
 * door). The QR payload carries no name and no link.
 */
export function toGuestPasses(party: PartyLinkRow): GuestPass[] {
  const salt = party.invitation.salt;
  const eventId = party.invitation.eventId;
  const passes: GuestPass[] = [];
  for (const guest of party.guests) {
    const pass = guest.passes[0];
    if (!pass) continue;
    passes.push({
      passId: pass.id,
      guestId: guest.id,
      guestName: fromLocalized(guest.name),
      isChild: guest.isChild,
      qr: signPass(salt, pass.id, eventId).qr,
      checkedInAt: pass.checkedInAt ? pass.checkedInAt.toISOString() : null,
    });
  }
  return passes;
}

export function eventPhase(
  event: Pick<Event, "startsAt" | "endsAt">,
  now: Date,
): "UPCOMING" | "PAST" {
  const endMs = event.endsAt
    ? Math.max(event.endsAt.getTime(), event.startsAt.getTime())
    : event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS;
  return now.getTime() >= endMs ? "PAST" : "UPCOMING";
}

export interface GuestViewInput {
  party: PartyLinkRow;
  plan: InvitationPlanEntitlements;
  preview: boolean;
  demo: boolean;
  wishes: Array<{ id: string; authorName: string; message: string; createdAt: Date }>;
  now: Date;
}

export function toWishView(wish: GuestViewInput["wishes"][number]): GuestWish {
  return {
    id: wish.id,
    authorName: wish.authorName,
    message: wish.message,
    createdAt: wish.createdAt.toISOString(),
  };
}

/** The whole guest view. Built field by field: nothing is spread from a database row. */
export function toGuestInvitationView(input: GuestViewInput): GuestInvitationView {
  const { party, plan, now } = input;
  const invitation = party.invitation;
  const event = invitation.event;
  const title = fromLocalized(event.title);
  const timeZone = event.timeZone;
  const state = computeRsvpState({
    demo: input.demo,
    preview: input.preview,
    rsvpDeadline: invitation.rsvpDeadline,
    startsAt: event.startsAt,
    now,
  });

  return {
    preview: input.preview,
    demo: input.demo,
    event: {
      title,
      ceremonySlug: event.ceremonySlug,
      experienceMode: event.experienceMode,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      startsAtLocal: utcToZonedWallTime(event.startsAt, timeZone),
      endsAtLocal: event.endsAt ? utcToZonedWallTime(event.endsAt, timeZone) : null,
      timeZone,
      phase: eventPhase(event, now),
    },
    invitation: {
      eventSlug: invitation.eventSlug,
      ...readPresentation(invitation, event.experienceMode),
      allowForwarding: invitation.allowForwarding,
      showBranding: !plan.removeBranding,
      content: readInvitationContent(invitation.contentJson, title),
      rsvpDeadline: invitation.rsvpDeadline ? invitation.rsvpDeadline.toISOString() : null,
      rsvpDeadlineLocal: invitation.rsvpDeadline
        ? utcToZonedWallTime(invitation.rsvpDeadline, timeZone)
        : null,
      rsvpConfig: readRsvpConfig(invitation.rsvpConfigJson, event.experienceMode),
      well: toWellView(invitation, event.experienceMode),
    },
    party: toPartyView(party),
    rsvp: toRsvpView(party, state),
    features: {
      passEnabled: plan.qrPassesAndCheckin,
      wishesEnabled: invitation.wellMode !== "NONE",
    },
    wishes: input.wishes.map(toWishView),
  };
}
