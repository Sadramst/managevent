/**
 * @managevent/api-client
 *
 * Typed client for `@managevent/api`: one resource object per API module, cookie or bearer
 * authentication, and the unified `{ error: { code, message, details?, requestId } }` error model.
 * Requests are validated with the request schema before they are sent, and responses with the
 * response schema, both from `@managevent/validators`.
 */
import type { HealthResponse, LeadCreateInput, LeadResponse } from "@managevent/types";
import { HealthResponseSchema, LeadCreateSchema, LeadResponseSchema } from "@managevent/validators";
import { z } from "zod";
import {
  GENERATED_API_VERSION,
  GENERATED_OPERATIONS,
  type GeneratedOperation,
} from "./generated.js";
import {
  buildGeneratedClientSource,
  type ExtractedOperation,
  extractOpenApiOperations,
} from "./generator.js";
import {
  type ApiClientOptions,
  apiPath,
  createHttpClient,
  type HttpClient,
  type HttpMethod,
  isApiError,
  ManageventApiClientError,
  type QueryParams,
  type RequestOptions,
  type ResponseSchema,
} from "./http.js";
import { createBillingResource } from "./resources/billing.js";
import { createCheckInResource } from "./resources/check-in.js";
import { createEventsResource } from "./resources/events.js";
import { createGuestListResource } from "./resources/guest-list.js";
import { createGuestSiteResource } from "./resources/guest-site.js";
import { createLeadsResource } from "./resources/leads.js";
import { createMeResource } from "./resources/me.js";
import { createMessagingResource } from "./resources/messaging.js";
import { createResponsesResource } from "./resources/responses.js";
import { createWellResource } from "./resources/well.js";

export {
  type ApiClientOptions,
  apiPath,
  buildGeneratedClientSource,
  createBillingResource,
  createCheckInResource,
  createEventsResource,
  createGuestListResource,
  createGuestSiteResource,
  createHttpClient,
  createLeadsResource,
  createMeResource,
  createMessagingResource,
  createResponsesResource,
  createWellResource,
  type ExtractedOperation,
  extractOpenApiOperations,
  GENERATED_API_VERSION,
  GENERATED_OPERATIONS,
  type GeneratedOperation,
  type HttpClient,
  type HttpMethod,
  isApiError,
  ManageventApiClientError,
  type QueryParams,
  type RequestOptions,
  type ResponseSchema,
};

const LeadListResponseSchema = z.object({
  items: z.array(LeadResponseSchema),
});

export class ManageventApiClient {
  private readonly http: HttpClient;

  /** `GET /v1/me` */
  readonly me: ReturnType<typeof createMeResource>;
  /** Host events and invitation editing. */
  readonly events: ReturnType<typeof createEventsResource>;
  /** Plan view and Premium Event Pass checkout. */
  readonly billing: ReturnType<typeof createBillingResource>;
  /** Guest micro-site (authenticated by the guest link). */
  readonly guestSite: ReturnType<typeof createGuestSiteResource>;
  /** Door list and scanning. */
  readonly checkIn: ReturnType<typeof createCheckInResource>;
  /** Wishing-well and tribute moderation. */
  readonly well: ReturnType<typeof createWellResource>;
  /** Parties, guests, CSV import and export. */
  readonly guestList: ReturnType<typeof createGuestListResource>;
  /** RSVP totals and the dietary matrix. */
  readonly responses: ReturnType<typeof createResponsesResource>;
  /** Email invitations, reminders and unsubscribe. */
  readonly messaging: ReturnType<typeof createMessagingResource>;
  /** Staff CRM inbox. */
  readonly leads: ReturnType<typeof createLeadsResource>;

  constructor(options: ApiClientOptions = {}) {
    this.http = createHttpClient(options);
    this.me = createMeResource(this.http);
    this.events = createEventsResource(this.http);
    this.billing = createBillingResource(this.http);
    this.guestSite = createGuestSiteResource(this.http);
    this.checkIn = createCheckInResource(this.http);
    this.well = createWellResource(this.http);
    this.guestList = createGuestListResource(this.http);
    this.responses = createResponsesResource(this.http);
    this.messaging = createMessagingResource(this.http);
    this.leads = createLeadsResource(this.http);
  }

  /**
   * `GET /health`
   */
  async getHealth(): Promise<HealthResponse> {
    return this.http.json({ method: "GET", path: "/health", schema: HealthResponseSchema });
  }

  /**
   * `POST /v1/leads`
   */
  async createLead(
    input: LeadCreateInput,
    options?: { idempotencyKey?: string },
  ): Promise<LeadResponse> {
    return this.http.json({
      method: "POST",
      path: "/v1/leads",
      body: LeadCreateSchema.parse(input),
      schema: LeadResponseSchema,
      ...(options?.idempotencyKey ? { options: { idempotencyKey: options.idempotencyKey } } : {}),
    });
  }

  /**
   * `GET /v1/leads`
   */
  async listLeads(): Promise<{ items: LeadResponse[] }> {
    return this.http.json({ method: "GET", path: "/v1/leads", schema: LeadListResponseSchema });
  }
}

/**
 * Factory helper to create a typed `ManageventApiClient`.
 */
export function createApiClient(options?: ApiClientOptions): ManageventApiClient {
  return new ManageventApiClient(options);
}
