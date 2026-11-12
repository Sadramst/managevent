"use server";

import type {
  GuestImportResult,
  HostGuestInput,
  HostGuestUpdate,
  HostPartyCreateInput,
  HostPartyUpdate,
  HostRsvpEntry,
} from "@managevent/validators";
import { type ActionResult, fail, runAction } from "@/lib/action-result";
import { MAX_CSV_LENGTH } from "@/lib/guest-list/csv-template";
import { revalidateEvent } from "@/lib/guest-list/event";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

/**
 * Guest list mutations (CONTRACT F). Each one requires a signed-in host, calls the API with the
 * host's own session and refreshes every tab of the event, because all of them show counts.
 * The API enforces permissions, plan limits and validation; failures come back as an
 * `ActionResult` with a plain message (`PLAN_LIMIT_EXCEEDED` also carries `details`).
 */

const guestsPath = (eventId: string) => routes.eventTab(eventId, "guests");

/** Adds a household. `idempotencyKey` makes a double press or a retry create it only once. */
export async function createPartyAction(
  eventId: string,
  input: HostPartyCreateInput,
  idempotencyKey: string,
): Promise<ActionResult<{ id: string; displayName: string }>> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    const party = await api.guestList.createParty(eventId, input, { idempotencyKey });
    revalidateEvent(eventId);
    return { id: party.id, displayName: party.displayName };
  });
}

export async function updatePartyAction(
  eventId: string,
  partyId: string,
  input: HostPartyUpdate,
): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.updateParty(eventId, partyId, input);
    revalidateEvent(eventId);
  });
}

export async function removePartyAction(eventId: string, partyId: string): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.removeParty(eventId, partyId);
    revalidateEvent(eventId);
  });
}

export async function addGuestAction(
  eventId: string,
  partyId: string,
  input: HostGuestInput,
): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.addGuest(eventId, partyId, input);
    revalidateEvent(eventId);
  });
}

export async function updateGuestAction(
  eventId: string,
  partyId: string,
  guestId: string,
  input: HostGuestUpdate,
): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.updateGuest(eventId, partyId, guestId, input);
    revalidateEvent(eventId);
  });
}

export async function removeGuestAction(
  eventId: string,
  partyId: string,
  guestId: string,
): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.removeGuest(eventId, partyId, guestId);
    revalidateEvent(eventId);
  });
}

/** A reply the host enters for a household (phone or in person). No health data is accepted. */
export async function setRsvpAction(
  eventId: string,
  partyId: string,
  input: HostRsvpEntry,
): Promise<ActionResult> {
  await requireHost(guestsPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.setRsvp(eventId, partyId, input);
    revalidateEvent(eventId);
  });
}

/**
 * CSV import. `dryRun: true` only reports what the file would add (households, row problems and
 * the plan limit); `dryRun: false` adds it. The commit takes an idempotency key so a retry after
 * a dropped connection cannot add the list twice.
 */
export async function importCsvAction(
  eventId: string,
  csv: string,
  dryRun: boolean,
  idempotencyKey?: string,
): Promise<ActionResult<GuestImportResult>> {
  await requireHost(guestsPath(eventId));
  if (typeof csv !== "string" || csv.trim().length === 0 || csv.length > MAX_CSV_LENGTH) {
    return fail("VALIDATION_ERROR");
  }
  return runAction(async () => {
    const api = await getServerApi();
    const result = await api.guestList.importCsv(
      eventId,
      { csv, dryRun },
      !dryRun && idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (!dryRun) revalidateEvent(eventId);
    return result;
  });
}
