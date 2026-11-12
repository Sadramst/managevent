/**
 * `client.well`: host moderation of wishing-well and tribute entries.
 *
 * Owner: Engineer 2. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type HostWellEntry,
  type HostWellEntryList,
  HostWellEntryListQuerySchema,
  HostWellEntryListSchema,
  HostWellEntrySchema,
  type WellEntryModerate,
  WellEntryModerateSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient } from "../http.js";

type MediaModeration = "PENDING" | "APPROVED" | "REJECTED";

export function createWellResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/well-entries?moderation=` */
    async list(eventId: string, q?: { moderation?: MediaModeration }): Promise<HostWellEntryList> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/well-entries`,
        query: HostWellEntryListQuerySchema.parse(q ?? {}),
        schema: HostWellEntryListSchema,
      });
    },

    /** `PATCH /v1/events/{eventId}/well-entries/{entryId}` */
    async moderate(
      eventId: string,
      entryId: string,
      input: WellEntryModerate,
    ): Promise<HostWellEntry> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/events/${eventId}/well-entries/${entryId}`,
        body: WellEntryModerateSchema.parse(input),
        schema: HostWellEntrySchema,
      });
    },

    /** `DELETE /v1/events/{eventId}/well-entries/{entryId}` */
    async remove(eventId: string, entryId: string): Promise<void> {
      return http.void({
        method: "DELETE",
        path: apiPath`/v1/events/${eventId}/well-entries/${entryId}`,
      });
    },
  };
}
