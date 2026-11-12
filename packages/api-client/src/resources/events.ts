/**
 * `client.events`: a host's events and their invitation.
 */
import {
  type HostEventCreateInput,
  HostEventCreateSchema,
  type HostEventDetail,
  HostEventDetailSchema,
  type HostEventList,
  HostEventListSchema,
  type HostEventUpdate,
  HostEventUpdateSchema,
  type HostInvitationUpdateInput,
  HostInvitationUpdateSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient } from "../http.js";

export function createEventsResource(http: HttpClient) {
  return {
    /** `GET /v1/events`: events the caller owns or co-hosts. */
    async list(): Promise<HostEventList> {
      return http.json({ method: "GET", path: "/v1/events", schema: HostEventListSchema });
    },

    /** `POST /v1/events` */
    async create(input: HostEventCreateInput): Promise<HostEventDetail> {
      return http.json({
        method: "POST",
        path: "/v1/events",
        body: HostEventCreateSchema.parse(input),
        schema: HostEventDetailSchema,
      });
    },

    /** `GET /v1/events/{eventId}` */
    async get(eventId: string): Promise<HostEventDetail> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}`,
        schema: HostEventDetailSchema,
      });
    },

    /** `PATCH /v1/events/{eventId}` */
    async update(eventId: string, input: HostEventUpdate): Promise<HostEventDetail> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/events/${eventId}`,
        body: HostEventUpdateSchema.parse(input),
        schema: HostEventDetailSchema,
      });
    },

    /** `DELETE /v1/events/{eventId}` */
    async remove(eventId: string): Promise<void> {
      return http.void({ method: "DELETE", path: apiPath`/v1/events/${eventId}` });
    },

    /** `PATCH /v1/events/{eventId}/invitation` */
    async updateInvitation(
      eventId: string,
      input: HostInvitationUpdateInput,
    ): Promise<HostEventDetail> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/events/${eventId}/invitation`,
        body: HostInvitationUpdateSchema.parse(input),
        schema: HostEventDetailSchema,
      });
    },

    /** `POST /v1/events/{eventId}/invitation/publish` */
    async publish(eventId: string): Promise<HostEventDetail> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/invitation/publish`,
        schema: HostEventDetailSchema,
      });
    },

    /** `POST /v1/events/{eventId}/invitation/unpublish` */
    async unpublish(eventId: string): Promise<HostEventDetail> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/invitation/unpublish`,
        schema: HostEventDetailSchema,
      });
    },
  };
}
