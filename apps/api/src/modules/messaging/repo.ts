/**
 * Messaging persistence: campaigns, send history (by address hash) and unsubscribes.
 *
 * `Message` has no party or guest column and stores only `sha256(address)`, so everything about
 * "who was already emailed" is answered through address hashes.
 */
import { generateId, type Prisma, type RsvpStatus } from "@managevent/db";
import {
  type EmailCampaignKind,
  EmailCampaignKindEnum,
  EmailCampaignSkipReasonEnum,
} from "@managevent/validators";
import { z } from "zod";
import type { DbTx } from "../../lib/deps.js";
import { INVITE_TEMPLATE_KEY, REMINDER_TEMPLATE_KEY } from "../guest-list/repo.js";

export const templateKeyFor = (kind: EmailCampaignKind): string =>
  kind === "INVITE" ? INVITE_TEMPLATE_KEY : REMINDER_TEMPLATE_KEY;

/**
 * `Campaign.audienceFilterJson`. `recipients` is what the worker sends to; `skipped` is kept so a
 * replayed request and the status page can report what was left out and why.
 */
export const CampaignAudienceSchema = z.object({
  kind: EmailCampaignKindEnum,
  recipients: z.array(z.object({ partyId: z.string(), guestId: z.string() })),
  skipped: z
    .array(z.object({ partyId: z.string(), reason: EmailCampaignSkipReasonEnum }))
    .default([]),
});
export type CampaignAudience = z.infer<typeof CampaignAudienceSchema>;

const IN_FLIGHT_STATUSES = ["QUEUED", "SENDING"];

export interface AudienceParty {
  id: string;
  tokenRevokedAt: Date | null;
  guests: Array<{ id: string; email: string | null; status: RsvpStatus }>;
}

/** Live parties (all, or the given ids) with their live guests' email and RSVP status. */
export async function loadAudienceParties(
  tx: DbTx,
  invitationId: string,
  partyIds: readonly string[] | "ALL",
): Promise<AudienceParty[]> {
  const rows = await tx.party.findMany({
    where: {
      invitationId,
      deletedAt: null,
      ...(partyIds === "ALL" ? {} : { id: { in: [...partyIds] } }),
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      tokenRevokedAt: true,
      guests: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, email: true, rsvp: { select: { status: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    tokenRevokedAt: row.tokenRevokedAt,
    guests: row.guests.map((guest) => ({
      id: guest.id,
      email: guest.email,
      status: guest.rsvp?.status ?? "PENDING",
    })),
  }));
}

export async function findUnsubscribedHashes(
  tx: DbTx,
  hashes: readonly string[],
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();
  const rows = await tx.unsubscribe.findMany({
    where: { channel: "EMAIL", address: { in: [...new Set(hashes)] } },
    select: { address: true },
  });
  return new Set(rows.map((row) => row.address));
}

/** How many emails of one template each address hash has successfully received for this event. */
export async function countSentByHash(
  tx: DbTx,
  eventId: string,
  templateKey: string,
  hashes: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (hashes.length === 0) return counts;
  const rows = await tx.message.groupBy({
    by: ["to"],
    where: {
      eventId,
      channel: "EMAIL",
      status: "SENT",
      templateKey,
      to: { in: [...new Set(hashes)] },
    },
    _count: { _all: true },
  });
  for (const row of rows) counts.set(row.to, row._count._all);
  return counts;
}

/** Emails that count against the plan quota: successful sends for this event. */
export function countSentEmails(tx: DbTx, eventId: string): Promise<number> {
  return tx.message.count({ where: { eventId, channel: "EMAIL", status: "SENT" } });
}

export interface InFlightCampaign {
  kind: EmailCampaignKind;
  guestIds: string[];
  /** Recipients the worker has not written a `Message` row for yet. */
  unsent: number;
}

/** Campaigns that are queued or being sent: their recipients are committed but not yet in `Message`. */
export async function loadInFlightCampaigns(
  tx: DbTx,
  invitationId: string,
): Promise<InFlightCampaign[]> {
  const rows = await tx.campaign.findMany({
    where: { invitationId, channel: "EMAIL", status: { in: IN_FLIGHT_STATUSES } },
    select: { audienceFilterJson: true, _count: { select: { messages: true } } },
  });
  return rows.flatMap((row) => {
    const audience = CampaignAudienceSchema.safeParse(row.audienceFilterJson);
    if (!audience.success) return [];
    return [
      {
        kind: audience.data.kind,
        guestIds: audience.data.recipients.map((recipient) => recipient.guestId),
        unsent: Math.max(0, audience.data.recipients.length - row._count.messages),
      },
    ];
  });
}

export async function loadGuestEmails(
  tx: DbTx,
  guestIds: readonly string[],
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  if (guestIds.length === 0) return emails;
  const rows = await tx.guest.findMany({
    where: { id: { in: [...new Set(guestIds)] }, email: { not: null } },
    select: { id: true, email: true },
  });
  for (const row of rows) if (row.email) emails.set(row.id, row.email);
  return emails;
}

export function findCampaignByIdempotencyKey(
  tx: DbTx,
  idempotencyKey: string,
): Promise<{ id: string; status: string; audienceFilterJson: Prisma.JsonValue } | null> {
  return tx.campaign.findUnique({
    where: { idempotencyKey },
    select: { id: true, status: true, audienceFilterJson: true },
  });
}

export async function createCampaign(
  tx: DbTx,
  data: {
    invitationId: string;
    status: string;
    consentAttestationUserId: string;
    idempotencyKey: string;
    audience: CampaignAudience;
  },
): Promise<string> {
  const id = generateId("cmp_");
  await tx.campaign.create({
    data: {
      id,
      invitationId: data.invitationId,
      channel: "EMAIL",
      audienceFilterJson: data.audience as Prisma.InputJsonValue,
      status: data.status,
      consentAttestationUserId: data.consentAttestationUserId,
      idempotencyKey: data.idempotencyKey,
    },
  });
  return id;
}

export interface CampaignSummaryRow {
  id: string;
  status: string;
  createdAt: Date;
  audienceFilterJson: Prisma.JsonValue;
  sent: number;
  failed: number;
}

/** The latest campaigns of an invitation with their send results. */
export async function listCampaigns(
  tx: DbTx,
  invitationId: string,
  take: number,
): Promise<CampaignSummaryRow[]> {
  const campaigns = await tx.campaign.findMany({
    where: { invitationId, channel: "EMAIL" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, status: true, createdAt: true, audienceFilterJson: true },
  });
  if (campaigns.length === 0) return [];
  const results = await tx.message.groupBy({
    by: ["campaignId", "status"],
    where: { campaignId: { in: campaigns.map((campaign) => campaign.id) } },
    _count: { _all: true },
  });
  const tally = (campaignId: string, status: string): number =>
    results.find((row) => row.campaignId === campaignId && row.status === status)?._count._all ?? 0;
  return campaigns.map((campaign) => ({
    ...campaign,
    sent: tally(campaign.id, "SENT"),
    failed: tally(campaign.id, "FAILED"),
  }));
}

/** Records an unsubscribe. Repeating it changes nothing (`@@unique([channel, address])`). */
export async function recordUnsubscribe(tx: DbTx, addressHash: string): Promise<void> {
  await tx.unsubscribe.upsert({
    where: { channel_address: { channel: "EMAIL", address: addressHash } },
    create: { id: generateId("uns_"), channel: "EMAIL", address: addressHash },
    update: {},
  });
}
