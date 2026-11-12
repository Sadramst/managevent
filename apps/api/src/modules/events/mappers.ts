/**
 * Database rows to host DTOs. Stored `{ en }` JSON becomes plain strings, every instant gains its
 * wall-clock twin in the event time zone, and the per-event salt never leaves this layer.
 */
import type { CoHostRole, Prisma } from "@managevent/db";
import { getInvitationPlan } from "@managevent/payments";
import {
  GateStyleEnum,
  type HostEventDetail,
  type HostEventSummary,
  type HostInvitation,
  type InvitationContent,
  InvitationContentSchema,
  InvitationTemplateSlugEnum,
  InvitationThemeIdEnum,
  type RsvpConfig,
  RsvpConfigSchema,
  type WellConfig,
  WellConfigSchema,
} from "@managevent/validators";
import type { z } from "zod";
import { fromLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime } from "../../lib/time.js";

/** Everything the host DTOs need, in one query shape. */
export const hostEventInclude = {
  invitation: {
    include: {
      parties: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          token: true,
          tokenRevokedAt: true,
          guests: {
            where: { deletedAt: null },
            select: { rsvp: { select: { status: true } } },
          },
        },
      },
    },
  },
  coHosts: { select: { userId: true, role: true } },
} satisfies Prisma.EventInclude;

export type HostEventRow = Prisma.EventGetPayload<{ include: typeof hostEventInclude }>;
export type HostEventRowWithInvitation = HostEventRow & {
  invitation: NonNullable<HostEventRow["invitation"]>;
};

/**
 * Reads a stored value that this API validated when it was written. A failure means the row was
 * changed outside the API, which is a server fault (500), not a caller mistake.
 */
function readStored<S extends z.ZodTypeAny>(schema: S, value: unknown, label: string): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Stored ${label} does not match its schema`);
  }
  return parsed.data as z.output<S>;
}

export function readInvitationContent(json: unknown): InvitationContent {
  return readStored(InvitationContentSchema, json, "invitation content");
}

export function readRsvpConfig(json: unknown): RsvpConfig {
  return readStored(RsvpConfigSchema, json, "RSVP configuration");
}

export function readWellConfig(json: unknown): WellConfig {
  return readStored(WellConfigSchema, json ?? {}, "well configuration");
}

/**
 * The caller's role on the event: `OWNER` for the owner, the co-host row's role otherwise. Staff
 * acting with `all` scope have no co-host row and are shown `OWNER`.
 */
export function roleOnEvent(row: HostEventRow, userId: string | undefined): CoHostRole {
  if (userId && row.ownerUserId === userId) return "OWNER";
  const coHost = userId ? row.coHosts.find((entry) => entry.userId === userId) : undefined;
  return coHost?.role ?? "OWNER";
}

function countGuests(row: HostEventRowWithInvitation): HostEventSummary["counts"] {
  let guests = 0;
  let yes = 0;
  let pending = 0;
  for (const party of row.invitation.parties) {
    for (const guest of party.guests) {
      guests += 1;
      const status = guest.rsvp?.status ?? "PENDING";
      if (status === "YES") yes += 1;
      else if (status === "PENDING") pending += 1;
    }
  }
  return { parties: row.invitation.parties.length, guests, yes, pending };
}

function latest(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function toHostEventSummary(
  row: HostEventRowWithInvitation,
  role: CoHostRole,
): HostEventSummary {
  const { invitation } = row;
  return {
    id: row.id,
    title: fromLocalized(row.title),
    ceremonySlug: row.ceremonySlug,
    experienceMode: row.experienceMode,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    startsAtLocal: utcToZonedWallTime(row.startsAt, row.timeZone),
    timeZone: row.timeZone,
    role,
    invitation: {
      id: invitation.id,
      eventSlug: invitation.eventSlug,
      templateSlug: readStored(InvitationTemplateSlugEnum, invitation.templateSlug, "template"),
      themeId: readStored(InvitationThemeIdEnum, invitation.themeId, "theme"),
      plan: invitation.plan,
      effectivePlan: getInvitationPlan(invitation.plan, row.experienceMode).plan,
      publishedAt: invitation.publishedAt?.toISOString() ?? null,
    },
    counts: countGuests(row),
    // The later of the two rows, so an edit to either moves the event up a "recently changed" list.
    updatedAt: latest(row.updatedAt, invitation.updatedAt).toISOString(),
  };
}

function toHostInvitation(row: HostEventRowWithInvitation, showGuestLink: boolean): HostInvitation {
  const { invitation } = row;
  // The preview path carries a live guest token, and a token is all it takes to answer for that
  // party. It is only given to callers who may write to the guest list anyway.
  const firstLiveParty = showGuestLink
    ? invitation.parties.find((party) => party.tokenRevokedAt === null)
    : undefined;
  return {
    id: invitation.id,
    eventSlug: invitation.eventSlug,
    templateSlug: readStored(InvitationTemplateSlugEnum, invitation.templateSlug, "template"),
    themeId: readStored(InvitationThemeIdEnum, invitation.themeId, "theme"),
    gateStyle: readStored(GateStyleEnum, invitation.gateStyle, "gate style"),
    plan: invitation.plan,
    effectivePlan: getInvitationPlan(invitation.plan, row.experienceMode).plan,
    isDemo: invitation.isDemo,
    publishedAt: invitation.publishedAt?.toISOString() ?? null,
    rsvpDeadline: invitation.rsvpDeadline?.toISOString() ?? null,
    rsvpDeadlineLocal: invitation.rsvpDeadline
      ? utcToZonedWallTime(invitation.rsvpDeadline, row.timeZone)
      : null,
    allowForwarding: invitation.allowForwarding,
    wellMode: invitation.wellMode,
    content: readInvitationContent(invitation.contentJson),
    rsvpConfig: readRsvpConfig(invitation.rsvpConfigJson),
    wellConfig: readWellConfig(invitation.wellConfigJson),
    previewPath: firstLiveParty ? `/i/${invitation.eventSlug}/${firstLiveParty.token}` : null,
    // The invitation row's own timestamp: this is the value `expectedUpdatedAt` is compared with.
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

export function toHostEventDetail(
  row: HostEventRowWithInvitation,
  role: CoHostRole,
  /** False for callers without `guest:write` (a VIEWER co-host): `previewPath` is then null. */
  showGuestLink: boolean,
): HostEventDetail {
  const summary = toHostEventSummary(row, role);
  const invitation = toHostInvitation(row, showGuestLink);
  return {
    ...summary,
    endsAt: row.endsAt?.toISOString() ?? null,
    endsAtLocal: row.endsAt ? utcToZonedWallTime(row.endsAt, row.timeZone) : null,
    invitation,
    checklist: {
      hasWording: invitation.content.wording.trim().length > 0,
      hasVenue: Boolean(invitation.content.venue?.name.trim()),
      hasGuests: summary.counts.guests > 0,
      published: invitation.publishedAt !== null,
    },
  };
}
