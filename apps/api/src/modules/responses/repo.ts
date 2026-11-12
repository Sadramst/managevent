/**
 * Read model for the responses pages: every live guest of an invitation with their decrypted RSVP.
 */
import { decryptRsvpRecord, type Prisma, type RsvpStatus } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";
import { fromLocalized } from "../../lib/localized.js";
import type { ResponseParty } from "./summary.js";

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const BASE_RSVP_SELECT = {
  status: true,
  respondedAt: true,
  songRequests: true,
  messageToHost: true,
} satisfies Prisma.RsvpSelect;
const HEALTH_RSVP_SELECT = {
  ...BASE_RSVP_SELECT,
  dietaryEncrypted: true,
  allergySeverityEncrypted: true,
  allergyNotes: true,
  accessibilityNotes: true,
} satisfies Prisma.RsvpSelect;

/**
 * Loads parties → guests → RSVP in one query. With `includeHealth` the health fields of each
 * nested RSVP row are selected and decrypted: the field-encryption extension only handles
 * top-level `rsvp` queries, so a nested row arrives as ciphertext (`dietaryEncrypted`,
 * `allergySeverityEncrypted`, encrypted notes) and has to go through `decryptRsvpRecord` here.
 * Without it the health columns never leave the database and every guest reads as having none.
 */
export async function loadResponseParties(
  tx: DbTx,
  invitationId: string,
  options: { includeHealth: boolean },
): Promise<ResponseParty[]> {
  const parties = await tx.party.findMany({
    where: { invitationId, deletedAt: null },
    orderBy: { id: "asc" },
    select: {
      displayName: true,
      tableLabel: true,
      guests: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          isChild: true,
          rsvp: { select: options.includeHealth ? HEALTH_RSVP_SELECT : BASE_RSVP_SELECT },
          passes: {
            where: { checkedInAt: { not: null }, revokedAt: null },
            select: { id: true },
          },
        },
      },
    },
  });

  return parties.map((party) => ({
    displayName: fromLocalized(party.displayName),
    tableLabel: party.tableLabel,
    guests: party.guests.map((guest) => {
      const rsvp: Record<string, unknown> | null = !guest.rsvp
        ? null
        : options.includeHealth
          ? decryptRsvpRecord(guest.rsvp as Record<string, unknown>)
          : guest.rsvp;
      const status: RsvpStatus = guest.rsvp?.status ?? "PENDING";
      return {
        guestId: guest.id,
        name: fromLocalized(guest.name),
        isChild: guest.isChild,
        status,
        respondedAt: guest.rsvp ? guest.rsvp.respondedAt : null,
        dietary: Array.isArray(rsvp?.dietary)
          ? rsvp.dietary.filter((tag): tag is string => typeof tag === "string")
          : [],
        allergySeverity: text(rsvp?.allergySeverity),
        allergyNotes: text(rsvp?.allergyNotes),
        accessibilityNotes: text(rsvp?.accessibilityNotes),
        songRequests: guest.rsvp?.songRequests ?? [],
        messageToHost: text(guest.rsvp?.messageToHost),
        checkedIn: guest.passes.length > 0,
      };
    }),
  }));
}

export async function loadLatestHeadcount(
  tx: DbTx,
  eventId: string,
): Promise<{ id: string; takenAt: Date; trigger: "RSVP" | "HOST_EDIT" | "SCHEDULED" } | null> {
  return tx.eventHeadcount.findFirst({
    where: { eventId },
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
    select: { id: true, takenAt: true, trigger: true },
  });
}

/** True when the event has an agency order for the headcount to feed. */
export async function hasLinkedOrder(tx: DbTx, eventId: string): Promise<boolean> {
  const order = await tx.order.findFirst({
    where: { eventId, deletedAt: null },
    select: { id: true },
  });
  return order !== null;
}
