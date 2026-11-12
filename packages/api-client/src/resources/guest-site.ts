/**
 * `client.guestSite`: the guest micro-site, authenticated by the link itself.
 *
 * Owner: Engineer 2. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type DemoList,
  DemoListSchema,
  type GuestCalendar,
  GuestCalendarSchema,
  type GuestInvitationView,
  GuestInvitationViewSchema,
  type GuestLinkStatus,
  GuestLinkStatusSchema,
  type GuestPassesView,
  GuestPassesViewSchema,
  type GuestRsvpResult,
  GuestRsvpResultSchema,
  type GuestRsvpSubmitInput,
  GuestRsvpSubmitSchema,
  type GuestWishResult,
  GuestWishResultSchema,
  type GuestWishSubmitInput,
  GuestWishSubmitSchema,
  type LegacyResolveResult,
  LegacyResolveResultSchema,
  LegacyResolveSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient, type RequestOptions } from "../http.js";

export function createGuestSiteResource(http: HttpClient) {
  return {
    /** `GET /v1/i/{eventSlug}/{guestToken}/status`: 200 active, 404 unknown, 410 revoked. */
    async getStatus(eventSlug: string, guestToken: string): Promise<GuestLinkStatus> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}/status`,
        schema: GuestLinkStatusSchema,
      });
    },

    /** `GET /v1/i/{eventSlug}/{guestToken}` */
    async getView(eventSlug: string, guestToken: string): Promise<GuestInvitationView> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}`,
        schema: GuestInvitationViewSchema,
      });
    },

    /** `POST /v1/i/{eventSlug}/{guestToken}/rsvp`. Reuse the same idempotency key on retry. */
    async submitRsvp(
      eventSlug: string,
      guestToken: string,
      input: GuestRsvpSubmitInput,
      opts: RequestOptions & { idempotencyKey: string },
    ): Promise<GuestRsvpResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}/rsvp`,
        body: GuestRsvpSubmitSchema.parse(input),
        schema: GuestRsvpResultSchema,
        options: opts,
      });
    },

    /** `GET /v1/i/{eventSlug}/{guestToken}/passes` */
    async getPasses(eventSlug: string, guestToken: string): Promise<GuestPassesView> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}/passes`,
        schema: GuestPassesViewSchema,
      });
    },

    /** `GET /v1/i/{eventSlug}/{guestToken}/calendar` */
    async getCalendar(eventSlug: string, guestToken: string): Promise<GuestCalendar> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}/calendar`,
        schema: GuestCalendarSchema,
      });
    },

    /** `POST /v1/i/{eventSlug}/{guestToken}/wishes` */
    async submitWish(
      eventSlug: string,
      guestToken: string,
      input: GuestWishSubmitInput,
      opts?: RequestOptions,
    ): Promise<GuestWishResult> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/i/${eventSlug}/${guestToken}/wishes`,
        body: GuestWishSubmitSchema.parse(input),
        schema: GuestWishResultSchema,
        ...(opts ? { options: opts } : {}),
      });
    },

    /** `GET /v1/public/demos` */
    async listDemos(): Promise<DemoList> {
      return http.json({ method: "GET", path: "/v1/public/demos", schema: DemoListSchema });
    },

    /** `POST /v1/public/legacy/resolve` */
    async resolveLegacy(path: string): Promise<LegacyResolveResult> {
      return http.json({
        method: "POST",
        path: "/v1/public/legacy/resolve",
        body: LegacyResolveSchema.parse({ path }),
        schema: LegacyResolveResultSchema,
      });
    },
  };
}
