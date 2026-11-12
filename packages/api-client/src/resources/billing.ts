/**
 * `client.billing`: the plan view and the Premium Event Pass checkout.
 */
import {
  type CheckoutConfirm,
  CheckoutConfirmSchema,
  CheckoutCreateSchema,
  type CheckoutSession,
  CheckoutSessionSchema,
  type PlanView,
  PlanViewSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient, type RequestOptions } from "../http.js";

export function createBillingResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/plan` */
    async getPlan(eventId: string): Promise<PlanView> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/plan`,
        schema: PlanViewSchema,
      });
    },

    /** `POST /v1/events/{eventId}/plan/checkout`. The idempotency key is required and reaches Stripe. */
    async createCheckout(
      eventId: string,
      opts: RequestOptions & { idempotencyKey: string },
    ): Promise<CheckoutSession> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/plan/checkout`,
        body: CheckoutCreateSchema.parse({}),
        schema: CheckoutSessionSchema,
        options: opts,
      });
    },

    /** `POST /v1/events/{eventId}/plan/checkout/confirm` */
    async confirmCheckout(eventId: string, input: CheckoutConfirm): Promise<PlanView> {
      return http.json({
        method: "POST",
        path: apiPath`/v1/events/${eventId}/plan/checkout/confirm`,
        body: CheckoutConfirmSchema.parse(input),
        schema: PlanViewSchema,
      });
    },
  };
}
