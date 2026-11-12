/**
 * Door check-in: the roster and the scan endpoint.
 *
 * Scan outcomes:
 * - unparseable payload, unknown pass, bad signature, or a manual guest who is not on this event's
 *   list → `INVALID` with no row (`ScanEvent.passId` is required, so there is nothing to attach it to)
 * - a genuine pass of another event → `WRONG_EVENT` row
 * - a revoked pass (or one whose guest or party was removed) → `INVALID` row
 * - already checked in → `DUPLICATE` row
 * - otherwise one atomic update checks the pass in → `OK` row
 * A replay of the same `clientUuid` returns the stored result and writes nothing.
 */
import { type AuthActor, checkPermission, type PermissionDecision } from "@managevent/auth";
import { decryptField, type ScanResult } from "@managevent/db";
import type {
  CheckInGuest,
  CheckInRoster,
  CheckInScan,
  CheckInScanResult,
} from "@managevent/validators";
import { type EventAccess, requireEntitlement, requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps, DbTx } from "../../lib/deps.js";
import { ApiProblem, isUniqueViolation } from "../../lib/errors.js";
import { isPassSignatureValid, verifyPassQr } from "../../lib/guest-tokens.js";
import { fromLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime } from "../../lib/time.js";
import { assertNotDemo } from "../events/service.js";
import { readDietaryTags } from "../headcount/service.js";
import { issuePass } from "./pass.js";
import {
  type CheckInGuestRow,
  createScanEvent,
  findLivePassId,
  findPassForScan,
  findRosterGuest,
  findScanByClientUuid,
  listRosterGuests,
  lockGuest,
  lockPass,
  markPassCheckedIn,
  type StoredScanRow,
} from "./repo.js";

const SEVERE_ALLERGY = "SEVERE_ANAPHYLAXIS";

const INVALID_WITHOUT_ROW: CheckInScanResult = {
  result: "INVALID",
  scanEventId: null,
  guest: null,
  firstCheckedInAt: null,
};

/** Earliest check-in time among the guest's live passes. */
function checkedInAtOf(guest: CheckInGuestRow): Date | null {
  let first: Date | null = null;
  for (const pass of guest.passes) {
    if (pass.checkedInAt && (!first || pass.checkedInAt < first)) first = pass.checkedInAt;
  }
  return first;
}

function isSevereAllergy(allergySeverityEncrypted: string | null | undefined): boolean {
  if (!allergySeverityEncrypted) return false;
  try {
    return decryptField(allergySeverityEncrypted) === SEVERE_ALLERGY;
  } catch {
    return false;
  }
}

/**
 * A door-list entry. With `includeHealth` the door sees dietary tags and a severe-allergy flag,
 * never the notes; without it both are empty.
 */
export function toCheckInGuest(guest: CheckInGuestRow, includeHealth: boolean): CheckInGuest {
  const checkedInAt = checkedInAtOf(guest);
  return {
    guestId: guest.id,
    name: fromLocalized(guest.name),
    isChild: guest.isChild,
    partyDisplayName: fromLocalized(guest.party.displayName),
    partySize: guest.party._count.guests,
    tableLabel: guest.party.tableLabel,
    status: guest.rsvp?.status ?? "PENDING",
    checkedInAt: checkedInAt ? checkedInAt.toISOString() : null,
    severeAllergy: includeHealth && isSevereAllergy(guest.rsvp?.allergySeverityEncrypted),
    dietaryFlags: includeHealth
      ? readDietaryTags(guest.rsvp?.dietaryEncrypted).filter((tag) => tag !== "NONE")
      : [],
  };
}

export class CheckInService {
  constructor(private readonly deps: ApiDeps) {}

  /** `checkin:scan` on the event, and the plan must include QR passes and check-in. */
  private async authorise(actor: AuthActor | null, eventId: string) {
    // The one surface door crew may use: a `roster`-scope grant is accepted here and nowhere else.
    const access = await requireEventAccess(this.deps, actor, eventId, "checkin:scan", {
      allowRosterScope: true,
    });
    requireEntitlement(access, "qrPassesAndCheckin");
    // Dietary flags are health information: shown only to actors who may read it. At roster
    // scope that means the tags and the severe-allergy flag (`toCheckInGuest`), never the notes.
    const health = checkPermission(actor, "health:read", access.scope);
    return { access, health };
  }

  /**
   * Staff and admin reads of health information are always recorded (PERMISSIONS.md: "all
   * (logged)"). A scan result shows one guest's flags, so the row names that guest.
   */
  private async auditHealthRead(
    db: DbTx,
    input: {
      actor: AuthActor | null;
      health: PermissionDecision;
      eventId: string;
      guestId: string;
      ip: string | undefined;
    },
  ): Promise<void> {
    if (!input.health.allowed || !input.health.auditLogged) return;
    await writeAudit(db, {
      actor: input.actor,
      action: "health.read",
      entity: "Guest",
      entityId: input.guestId,
      diff: { eventId: input.eventId, surface: "check-in.scan" },
      ...(input.ip ? { ip: input.ip } : {}),
    });
  }

  async getRoster(actor: AuthActor | null, eventId: string, ip?: string): Promise<CheckInRoster> {
    const { access, health } = await this.authorise(actor, eventId);
    const rows = await listRosterGuests(this.deps.db, access.invitation.id);
    const guests = rows
      .map((row) => toCheckInGuest(row, health.allowed))
      .sort(
        (a, b) =>
          a.partyDisplayName.localeCompare(b.partyDisplayName, "en") ||
          a.name.localeCompare(b.name, "en"),
      );

    if (health.allowed && health.auditLogged) {
      await writeAudit(this.deps.db, {
        actor,
        action: "health.read",
        entity: "Event",
        entityId: access.event.id,
        diff: { surface: "check-in", guestCount: guests.length },
        ...(ip ? { ip } : {}),
      });
    }

    return {
      event: {
        title: access.event.title,
        startsAt: access.event.startsAt.toISOString(),
        startsAtLocal: utcToZonedWallTime(access.event.startsAt, access.event.timeZone),
        timeZone: access.event.timeZone,
      },
      totals: {
        expected: guests.filter((guest) => guest.status === "YES").length,
        checkedIn: guests.filter((guest) => guest.checkedInAt !== null).length,
      },
      guests,
    };
  }

  async scan(
    actor: AuthActor | null,
    eventId: string,
    input: CheckInScan,
    ip?: string,
  ): Promise<CheckInScanResult> {
    const { access, health } = await this.authorise(actor, eventId);
    // A scan issues passes and checks guests in. Sample invitations are read-only for everyone.
    assertNotDemo(access);
    const audit = { actor, health, ip };

    // Offline replay: the same scan id always gets the stored answer.
    const replay = await findScanByClientUuid(this.deps.db, input.clientUuid);
    if (replay) return this.storedResult(this.deps.db, replay, access, audit);

    const now = this.deps.now();
    // The device clock is not trusted to be ahead of the server.
    const scannedAt = new Date(Math.min(new Date(input.scannedAt).getTime(), now.getTime()));

    let qrPassId: string | null = null;
    if (input.method === "QR") {
      const parsed = verifyPassQr(input.qr);
      if (!parsed) return INVALID_WITHOUT_ROW;
      const pass = await findPassForScan(this.deps.db, parsed.passId);
      if (!pass) return INVALID_WITHOUT_ROW;
      // Verified against the pass's own event, so a genuine pass of another event is told apart
      // from a forged one.
      const invitation = pass.party.invitation;
      if (!isPassSignatureValid(invitation.salt, pass.id, invitation.eventId, parsed.sig)) {
        return INVALID_WITHOUT_ROW;
      }
      qrPassId = pass.id;
    }

    try {
      return await this.deps.db.$transaction(async (tx) => {
        let passId = qrPassId;
        if (input.method === "MANUAL") {
          const guest = await findRosterGuest(tx, access.invitation.id, input.guestId);
          if (!guest) return INVALID_WITHOUT_ROW;
          await lockGuest(tx, guest.id);
          passId =
            (await findLivePassId(tx, guest.id)) ??
            (
              await issuePass(tx, {
                salt: access.invitation.salt,
                eventId: access.event.id,
                partyId: guest.party.id,
                guestId: guest.id,
              })
            ).id;
        }
        if (!passId) return INVALID_WITHOUT_ROW;

        await lockPass(tx, passId);
        const concurrent = await findScanByClientUuid(tx, input.clientUuid);
        if (concurrent) return this.storedResult(tx, concurrent, access, audit);

        const pass = await findPassForScan(tx, passId);
        if (!pass) return INVALID_WITHOUT_ROW;

        const inThisEvent = pass.party.invitation.eventId === access.event.id;
        const removed =
          pass.revokedAt !== null ||
          pass.party.deletedAt !== null ||
          (pass.guest !== null && pass.guest.deletedAt !== null);

        let result: ScanResult;
        let firstCheckedInAt: Date | null = null;
        if (!inThisEvent) {
          result = "WRONG_EVENT";
        } else if (removed) {
          result = "INVALID";
        } else if (pass.checkedInAt !== null) {
          result = "DUPLICATE";
          firstCheckedInAt = pass.checkedInAt;
        } else {
          const checkedIn = await markPassCheckedIn(tx, {
            passId: pass.id,
            at: scannedAt,
            byUserId: actor?.userId ?? null,
            deviceId: input.deviceId,
          });
          if (checkedIn) {
            result = "OK";
            firstCheckedInAt = scannedAt;
          } else {
            result = "DUPLICATE";
            firstCheckedInAt = (await findPassForScan(tx, pass.id))?.checkedInAt ?? null;
          }
        }

        const scanEventId = await createScanEvent(tx, {
          passId: pass.id,
          eventId: access.event.id,
          deviceId: input.deviceId,
          scannedAt,
          clientUuid: input.clientUuid,
          result,
        });

        const guestId = inThisEvent ? (pass.guest?.id ?? null) : null;
        const guestRow = guestId ? await findRosterGuest(tx, access.invitation.id, guestId) : null;
        if (guestRow) {
          // In the scan's own transaction: flags are not returned without the record of it.
          await this.auditHealthRead(tx, {
            ...audit,
            eventId: access.event.id,
            guestId: guestRow.id,
          });
        }
        return {
          result,
          scanEventId,
          guest: guestRow ? toCheckInGuest(guestRow, health.allowed) : null,
          firstCheckedInAt: firstCheckedInAt ? firstCheckedInAt.toISOString() : null,
        };
      });
    } catch (err) {
      // Two requests raced on the same `clientUuid`: the other one's row is the answer.
      if (isUniqueViolation(err)) {
        const stored = await findScanByClientUuid(this.deps.db, input.clientUuid);
        if (stored) return this.storedResult(this.deps.db, stored, access, audit);
      }
      throw err;
    }
  }

  private async storedResult(
    db: DbTx,
    scan: StoredScanRow,
    access: EventAccess,
    audit: { actor: AuthActor | null; health: PermissionDecision; ip: string | undefined },
  ): Promise<CheckInScanResult> {
    if (scan.eventId !== access.event.id) {
      // Never reveal another event's scan. The client generated a colliding id.
      throw new ApiProblem(409, "CONFLICT", "This scan id has already been used");
    }
    const inThisEvent = scan.pass.party.invitation.eventId === access.event.id;
    const guestRow =
      inThisEvent && scan.pass.guestId
        ? await findRosterGuest(db, access.invitation.id, scan.pass.guestId)
        : null;
    const showCheckIn = inThisEvent && (scan.result === "OK" || scan.result === "DUPLICATE");
    if (guestRow) {
      // A replay shows the flags again, so it is recorded again.
      await this.auditHealthRead(db, { ...audit, eventId: access.event.id, guestId: guestRow.id });
    }
    return {
      result: scan.result,
      scanEventId: scan.id,
      guest: guestRow ? toCheckInGuest(guestRow, audit.health.allowed) : null,
      firstCheckedInAt:
        showCheckIn && scan.pass.checkedInAt ? scan.pass.checkedInAt.toISOString() : null,
    };
  }
}
