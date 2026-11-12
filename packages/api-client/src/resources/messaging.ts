/**
 * `client.messaging`: email invitations, RSVP reminders and unsubscribe.
 *
 * Owner: Engineer 3. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type EmailCampaignCreate,
  type EmailCampaignResult,
  EmailCampaignCreateSchema,
  EmailCampaignResultSchema,
  type MessagingStatus,
  MessagingStatusSchema,
  type UnsubscribeResult,
  UnsubscribeResultSchema,
  UnsubscribeSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient, type RequestOptions } from "../http.js";

export function createMessagingResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/messaging` */
    async getStatus(eventId: string): Promise<MessagingStatus> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/messaging`,
        schema: MessagingStatusSchema,
      });
    },

    /** `POST /v1/events/{eventId}/messaging/email-invitations` */
    async sendEmailInvitations(
      eventId: string,
      input: EmailCampaignCreate,
      opts: RequestOptions & { idempotencyKey: string },
    ): Promise<EmailCampaignResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/messaging/email-invitations`,
        body: EmailCampaignCreateSchema.parse(input),
        schema: EmailCampaignResultSchema,
        options: opts,
      });
    },

    /** `POST /v1/events/{eventId}/messaging/rsvp-reminders`. `"ALL"` means every pending party. */
    async sendRsvpReminders(
      eventId: string,
      input: EmailCampaignCreate,
      opts: RequestOptions & { idempotencyKey: string },
    ): Promise<EmailCampaignResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/messaging/rsvp-reminders`,
        body: EmailCampaignCreateSchema.parse(input),
        schema: EmailCampaignResultSchema,
        options: opts,
      });
    },

    /** `POST /v1/public/unsubscribe` */
    async unsubscribe(input: { token: string }): Promise<UnsubscribeResult> {
      return http.json({
        method: "POST",
        path: "/v1/public/unsubscribe",
        body: UnsubscribeSchema.parse(input),
        schema: UnsubscribeResultSchema,
      });
    },
  };
}
