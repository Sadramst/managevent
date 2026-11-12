"use server";

import { type ActionResult, fail, runAction } from "@/lib/action-result";
import type { DoorRoster, DoorScanResult } from "@/lib/guest-list/door";
import { toDoorGuest, toDoorRoster } from "@/lib/guest-list/door-load";
import { formatInstantTime } from "@/lib/guest-list/instants";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

export type DoorScanInput =
  | { method: "MANUAL"; guestId: string; clientUuid: string; deviceId: string }
  | { method: "QR"; qr: string; clientUuid: string; deviceId: string };

export interface DoorScanResponse extends DoorScanResult {
  /** The door list straight after the scan, so totals stay true across several door devices. */
  roster: DoorRoster;
}

const isShortString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

/**
 * Records one arrival: a tap on the door list (`MANUAL`) or a scanned or typed pass code
 * (`QR`). `clientUuid` identifies this attempt, so a retry after a dropped connection returns
 * the stored result instead of checking the guest in twice.
 *
 * The fresh door list comes back with the result. Nothing is revalidated here: the door page
 * holds its own list, and the studio pages always read live data.
 */
export async function scanAction(
  eventId: string,
  input: DoorScanInput,
): Promise<ActionResult<DoorScanResponse>> {
  await requireHost(routes.checkIn(eventId));
  if (!isShortString(input?.clientUuid, 64) || !isShortString(input?.deviceId, 120)) {
    return fail("VALIDATION_ERROR");
  }
  const base = {
    clientUuid: input.clientUuid,
    deviceId: input.deviceId,
    scannedAt: new Date().toISOString(),
  };
  return runAction(async () => {
    const api = await getServerApi();
    const scan =
      input.method === "MANUAL"
        ? await api.checkIn.scan(eventId, { method: "MANUAL", guestId: input.guestId, ...base })
        : await api.checkIn.scan(eventId, {
            method: "QR",
            qr: String(input.qr).trim().slice(0, 200),
            ...base,
          });
    const roster = await api.checkIn.getRoster(eventId);
    const { timeZone } = roster.event;
    return {
      result: scan.result,
      guest: scan.guest ? toDoorGuest(scan.guest, timeZone) : null,
      firstArrivedAt: scan.firstCheckedInAt
        ? formatInstantTime(scan.firstCheckedInAt, timeZone)
        : null,
      roster: toDoorRoster(roster),
    };
  });
}

/** The current door list, for the periodic refresh that keeps several door devices in step. */
export async function refreshRosterAction(eventId: string): Promise<ActionResult<DoorRoster>> {
  await requireHost(routes.checkIn(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    return toDoorRoster(await api.checkIn.getRoster(eventId));
  });
}
