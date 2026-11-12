/**
 * `client.guestList`: parties, guests, host RSVP entry, CSV import and export.
 *
 * Owner: Engineer 3. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type GuestImportInput,
  type GuestImportResult,
  GuestImportResultSchema,
  GuestImportSchema,
  type HostGuestInput,
  HostGuestInputSchema,
  type HostGuestUpdate,
  HostGuestUpdateSchema,
  type HostParty,
  type HostPartyCreateInput,
  HostPartyCreateSchema,
  type HostPartyList,
  type HostPartyListQueryInput,
  HostPartyListQuerySchema,
  HostPartyListSchema,
  HostPartySchema,
  type HostPartyUpdate,
  HostPartyUpdateSchema,
  type HostRsvpEntry,
  HostRsvpEntrySchema,
} from "@managevent/validators";
import { apiPath, type HttpClient, type RequestOptions } from "../http.js";

const UTF8_BOM = "\uFEFF";

export function createGuestListResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/parties` */
    async listParties(eventId: string, q?: HostPartyListQueryInput): Promise<HostPartyList> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/parties`,
        query: HostPartyListQuerySchema.parse(q ?? {}),
        schema: HostPartyListSchema,
      });
    },

    /** `POST /v1/events/{eventId}/parties`. An idempotency key makes a retried create safe. */
    async createParty(
      eventId: string,
      input: HostPartyCreateInput,
      opts?: RequestOptions,
    ): Promise<HostParty> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/parties`,
        body: HostPartyCreateSchema.parse(input),
        schema: HostPartySchema,
        ...(opts ? { options: opts } : {}),
      });
    },

    /** `PATCH /v1/events/{eventId}/parties/{partyId}` */
    async updateParty(
      eventId: string,
      partyId: string,
      input: HostPartyUpdate,
    ): Promise<HostParty> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}`,
        body: HostPartyUpdateSchema.parse(input),
        schema: HostPartySchema,
      });
    },

    /** `DELETE /v1/events/{eventId}/parties/{partyId}` */
    async removeParty(eventId: string, partyId: string): Promise<void> {
      return http.void({
        method: "DELETE",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}`,
      });
    },

    /** `POST /v1/events/{eventId}/parties/{partyId}/revoke-link` */
    async revokeLink(eventId: string, partyId: string): Promise<HostParty> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/revoke-link`,
        schema: HostPartySchema,
      });
    },

    /** `POST /v1/events/{eventId}/parties/{partyId}/reissue-link` */
    async reissueLink(eventId: string, partyId: string): Promise<HostParty> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/reissue-link`,
        schema: HostPartySchema,
      });
    },

    /** `POST /v1/events/{eventId}/parties/{partyId}/guests` */
    async addGuest(eventId: string, partyId: string, input: HostGuestInput): Promise<HostParty> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/guests`,
        body: HostGuestInputSchema.parse(input),
        schema: HostPartySchema,
      });
    },

    /** `PATCH /v1/events/{eventId}/parties/{partyId}/guests/{guestId}` */
    async updateGuest(
      eventId: string,
      partyId: string,
      guestId: string,
      input: HostGuestUpdate,
    ): Promise<HostParty> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/guests/${guestId}`,
        body: HostGuestUpdateSchema.parse(input),
        schema: HostPartySchema,
      });
    },

    /** `DELETE /v1/events/{eventId}/parties/{partyId}/guests/{guestId}` */
    async removeGuest(eventId: string, partyId: string, guestId: string): Promise<void> {
      return http.void({
        method: "DELETE",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/guests/${guestId}`,
      });
    },

    /** `PUT /v1/events/{eventId}/parties/{partyId}/rsvp`: host entry on the party's behalf. */
    async setRsvp(eventId: string, partyId: string, input: HostRsvpEntry): Promise<HostParty> {
      return http.json({
        method: "PUT",
        path: apiPath`/v1/events/${eventId}/parties/${partyId}/rsvp`,
        body: HostRsvpEntrySchema.parse(input),
        schema: HostPartySchema,
      });
    },

    /** `POST /v1/events/{eventId}/guests/import`. `dryRun` defaults to true. */
    async importCsv(
      eventId: string,
      input: GuestImportInput,
      opts?: RequestOptions,
    ): Promise<GuestImportResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/guests/import`,
        body: GuestImportSchema.parse(input),
        schema: GuestImportResultSchema,
        ...(opts ? { options: opts } : {}),
      });
    },

    /**
     * `GET /v1/events/{eventId}/guests/export.csv?includeHealth=`
     *
     * `csv` always starts with a UTF-8 byte order mark, so it can be served or saved as it is
     * and Excel reads accented and non-Latin names correctly. (Decoding a response as text
     * drops the mark the API sends, so it is put back here.) Health columns need `health:read`;
     * without it `includeHealth: true` is a 403.
     */
    async exportCsv(
      eventId: string,
      q?: { includeHealth?: boolean },
    ): Promise<{ filename: string; csv: string }> {
      const res = await http.text({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/guests/export.csv`,
        ...(q?.includeHealth !== undefined ? { query: { includeHealth: q.includeHealth } } : {}),
      });
      return {
        filename: res.filename ?? "guests.csv",
        csv: res.body.startsWith(UTF8_BOM) ? res.body : `${UTF8_BOM}${res.body}`,
      };
    },
  };
}
