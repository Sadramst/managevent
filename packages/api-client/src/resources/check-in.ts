/**
 * `client.checkIn`: the door list and scanning.
 *
 * Owner: Engineer 2. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type CheckInRoster,
  CheckInRosterSchema,
  type CheckInScan,
  type CheckInScanResult,
  CheckInScanResultSchema,
  CheckInScanSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient } from "../http.js";

export function createCheckInResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/check-in` */
    async getRoster(eventId: string): Promise<CheckInRoster> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/check-in`,
        schema: CheckInRosterSchema,
      });
    },

    /** `POST /v1/events/{eventId}/check-in/scans`. Replays of the same `clientUuid` are safe. */
    async scan(eventId: string, input: CheckInScan): Promise<CheckInScanResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/check-in/scans`,
        body: CheckInScanSchema.parse(input),
        schema: CheckInScanResultSchema,
      });
    },
  };
}
