/**
 * Pass issuing for attending guests.
 *
 * A pass is one signed QR code per attending guest (`MV1.{passId}.{sig}`). It carries no name and
 * no guest link; the signature binds the pass id to its event, so a pass cannot be replayed at
 * another event.
 */
import { generateId, type Invitation } from "@managevent/db";
import { getInvitationPlan } from "@managevent/payments";
import type { EventAccess } from "../../lib/access.js";
import type { DbTx } from "../../lib/deps.js";
import { signPass } from "../../lib/guest-tokens.js";

/** True when the event's plan includes QR passes and door check-in. */
export function passesEnabled(access: {
  invitation: Pick<Invitation, "plan">;
  event: Pick<EventAccess["event"], "experienceMode">;
}): boolean {
  return getInvitationPlan(access.invitation.plan, access.event.experienceMode).qrPassesAndCheckin;
}

/** Creates one live pass for a guest and returns its id. */
export async function issuePass(
  tx: DbTx,
  input: { salt: string; eventId: string; partyId: string; guestId: string },
): Promise<{ id: string; qrPayloadSig: string }> {
  const id = generateId("pass_");
  const { sig } = signPass(input.salt, id, input.eventId);
  await tx.pass.create({
    data: { id, guestId: input.guestId, partyId: input.partyId, qrPayloadSig: sig },
  });
  return { id, qrPayloadSig: sig };
}

/**
 * Issues a Pass for each `YES` guest of the party without a live pass and sets `revokedAt` on
 * passes of guests who are no longer attending or were deleted. A pass that was already used at
 * the door stays live unless its guest was removed. A no-op unless the event's plan includes
 * `qrPassesAndCheckin`.
 */
export async function syncPassesForParty(
  tx: DbTx,
  access: { invitation: Invitation; event: EventAccess["event"] },
  partyId: string,
): Promise<void> {
  if (!passesEnabled(access)) return;

  const party = await tx.party.findFirst({
    where: { id: partyId, invitationId: access.invitation.id },
    select: {
      deletedAt: true,
      guests: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          deletedAt: true,
          rsvp: { select: { status: true } },
          passes: {
            where: { revokedAt: null },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true, checkedInAt: true },
          },
        },
      },
    },
  });
  if (!party) return;

  const toRevoke: string[] = [];
  for (const guest of party.guests) {
    const attending =
      party.deletedAt === null && guest.deletedAt === null && guest.rsvp?.status === "YES";
    if (attending) {
      if (guest.passes.length === 0) {
        await issuePass(tx, {
          salt: access.invitation.salt,
          eventId: access.event.id,
          partyId,
          guestId: guest.id,
        });
      } else {
        // Never more than one live pass per guest; a pass already used at the door wins.
        const keep = guest.passes.find((pass) => pass.checkedInAt !== null) ?? guest.passes[0];
        for (const pass of guest.passes) {
          if (pass.id !== keep?.id) toRevoke.push(pass.id);
        }
      }
    } else {
      // A guest who was checked in at the door (for example by hand, without an RSVP) keeps that
      // pass: the check-in is a fact. Only a removed guest loses it.
      const removed = party.deletedAt !== null || guest.deletedAt !== null;
      for (const pass of guest.passes) {
        if (removed || pass.checkedInAt === null) toRevoke.push(pass.id);
      }
    }
  }

  if (toRevoke.length > 0) {
    await tx.pass.updateMany({
      where: { id: { in: toRevoke }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
