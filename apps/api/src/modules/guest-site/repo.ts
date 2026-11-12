/**
 * Database access for the guest micro-site. Every function takes the client (or the client inside
 * a transaction) so the service can compose them into one RSVP transaction.
 *
 * Nested `rsvp` rows come back with their health fields still encrypted: the encryption extension
 * only decrypts top-level `rsvp` queries. Mappers decrypt what they need and nothing else.
 */
import { generateId, type Prisma } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";

const GUEST_ORDER = [{ createdAt: "asc" }, { id: "asc" }] as const;

export const partyLinkInclude = {
  invitation: { include: { event: true } },
  guests: {
    where: { deletedAt: null },
    orderBy: [...GUEST_ORDER],
    include: {
      rsvp: true,
      passes: { where: { revokedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  },
} satisfies Prisma.PartyInclude;

/** A party with its invitation, event and active guests (each with RSVP and live passes). */
export type PartyLinkRow = Prisma.PartyGetPayload<{ include: typeof partyLinkInclude }>;
export type PartyGuestRow = PartyLinkRow["guests"][number];

/**
 * Exact-match lookup of a guest link. Returns the party whose CURRENT token is `token`, or else a
 * party that used to have it (the caller answers 410 for that). Never matches by prefix or name.
 */
export async function findPartyByToken(
  db: DbTx,
  eventSlug: string,
  token: string,
): Promise<PartyLinkRow | null> {
  const rows = await db.party.findMany({
    where: {
      invitation: { eventSlug, deletedAt: null, event: { deletedAt: null } },
      OR: [{ token }, { revokedTokens: { has: token } }],
    },
    include: partyLinkInclude,
    take: 5,
  });
  return rows.find((row) => row.token === token) ?? rows[0] ?? null;
}

export async function findPartyById(db: DbTx, partyId: string): Promise<PartyLinkRow | null> {
  return db.party.findUnique({ where: { id: partyId }, include: partyLinkInclude });
}

/**
 * Takes a row lock on the party for the rest of the transaction, so two submissions for the same
 * party run one after the other (seat limits and idempotent replay depend on it).
 * `NO KEY UPDATE` does not block inserts that reference the party.
 */
export async function lockParty(tx: DbTx, partyId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Party" WHERE "id" = ${partyId} FOR NO KEY UPDATE`;
}

/** `WebhookEvent.provider` of the RSVP submission ledger. */
export const RSVP_SUBMISSION_PROVIDER = "guest-rsvp";

export interface RsvpSubmissionRecord {
  /** Keyed hash of the request body that was applied. */
  bodyHash: string;
  /** The headcount snapshot that submission produced. */
  headcountId: string | null;
}

const submissionEventId = (partyId: string, key: string): string => `${partyId}:${key}`;

/**
 * The append-only record that a party's RSVP request with this `Idempotency-Key` was applied.
 *
 * It lives in `WebhookEvent` (an inbound event stored once, unique on provider + event id), not
 * on the `Rsvp` rows: those are rewritten by every later submission, so a marker kept there is
 * destroyed by the next answer and an old request arriving late would be applied a second time.
 */
export async function findRsvpSubmission(
  tx: DbTx,
  partyId: string,
  key: string,
): Promise<RsvpSubmissionRecord | null> {
  const row = await tx.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: RSVP_SUBMISSION_PROVIDER,
        providerEventId: submissionEventId(partyId, key),
      },
    },
    select: { payloadJson: true },
  });
  if (!row) return null;
  const payload =
    typeof row.payloadJson === "object" && row.payloadJson !== null ? row.payloadJson : {};
  const { bodyHash, headcountId } = payload as Record<string, unknown>;
  return {
    bodyHash: typeof bodyHash === "string" ? bodyHash : "",
    headcountId: typeof headcountId === "string" ? headcountId : null,
  };
}

/** Call inside the RSVP transaction, under the party lock, once the submission is applied. */
export async function recordRsvpSubmission(
  tx: DbTx,
  input: { partyId: string; key: string; bodyHash: string; headcountId: string; at: Date },
): Promise<void> {
  await tx.webhookEvent.create({
    data: {
      id: generateId("whk_"),
      provider: RSVP_SUBMISSION_PROVIDER,
      providerEventId: submissionEventId(input.partyId, input.key),
      type: "rsvp.submit",
      // No answers and no names: a keyed hash to recognise the same request, and its outcome.
      payloadJson: { bodyHash: input.bodyHash, headcountId: input.headcountId },
      receivedAt: input.at,
      processedAt: input.at,
    },
  });
}

export async function findLatestHeadcountId(tx: DbTx, eventId: string): Promise<string | null> {
  const row = await tx.eventHeadcount.findFirst({
    where: { eventId },
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Approved entries the hosts chose to share, newest first. Messages are decrypted by the client. */
export async function listWallWishes(db: DbTx, invitationId: string, take = 50) {
  return db.wellEntry.findMany({
    where: { invitationId, deletedAt: null, moderation: "APPROVED", visibility: "WALL" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, authorName: true, message: true, createdAt: true },
  });
}

export async function findWishByIdempotencyKey(db: DbTx, idempotencyKey: string) {
  return db.wellEntry.findUnique({
    where: { idempotencyKey },
    select: { id: true, partyId: true, moderation: true, visibility: true },
  });
}

/** Every entry the party ever wrote, including removed ones, so the cap cannot be cycled. */
export async function countPartyWishes(db: DbTx, partyId: string): Promise<number> {
  return db.wellEntry.count({ where: { partyId } });
}

export const demoInclude = {
  event: true,
  parties: {
    where: { deletedAt: null, tokenRevokedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 1,
    select: { token: true },
  },
} satisfies Prisma.InvitationInclude;

export type DemoRow = Prisma.InvitationGetPayload<{ include: typeof demoInclude }>;

export async function listDemoInvitations(db: DbTx): Promise<DemoRow[]> {
  return db.invitation.findMany({
    where: {
      isDemo: true,
      publishedAt: { not: null },
      deletedAt: null,
      event: { deletedAt: null },
    },
    include: demoInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 50,
  });
}

/** Resolves an imported legacy path to the live link it stands for, or null. */
export async function findLegacyLink(
  db: DbTx,
  legacyPaths: string[],
): Promise<{ eventSlug: string; token: string } | null> {
  const row = await db.legacySlug.findFirst({
    where: {
      legacyPath: { in: legacyPaths },
      party: {
        deletedAt: null,
        tokenRevokedAt: null,
        invitation: {
          deletedAt: null,
          publishedAt: { not: null },
          event: { deletedAt: null },
        },
      },
    },
    select: { party: { select: { token: true, invitation: { select: { eventSlug: true } } } } },
  });
  if (!row) return null;
  return { eventSlug: row.party.invitation.eventSlug, token: row.party.token };
}
