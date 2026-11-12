/**
 * The one place the API obtains a Stripe client and translates Stripe failures.
 *
 * There is no fallback: without real credentials every payment route answers
 * `503 PAYMENTS_NOT_CONFIGURED`, and `GET /v1/me` reports `stripeCheckout: false`.
 */
import {
  createStripeCheckoutClient,
  PaymentsNotConfiguredError,
  type StripeCheckoutClient,
} from "@managevent/payments";
import { ApiProblem } from "../../lib/errors.js";

/** Builds the client. Tests pass one that points the real SDK at a local transport. */
export type StripeClientFactory = () => StripeCheckoutClient;

export const defaultStripeClientFactory: StripeClientFactory = () => createStripeCheckoutClient();

export function paymentsNotConfigured(): ApiProblem {
  return new ApiProblem(503, "PAYMENTS_NOT_CONFIGURED", "Online payments are not configured");
}

export function getStripeClient(factory: StripeClientFactory): StripeCheckoutClient {
  try {
    return factory();
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) throw paymentsNotConfigured();
    throw err;
  }
}

function stripeErrorField(err: unknown, field: "type" | "code"): string | null {
  if (typeof err !== "object" || err === null) return null;
  const value = (err as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

/** True when Stripe says the object does not exist in this account. */
export function isStripeResourceMissing(err: unknown): boolean {
  return (
    stripeErrorField(err, "type") === "StripeInvalidRequestError" &&
    stripeErrorField(err, "code") === "resource_missing"
  );
}

/**
 * Runs a Stripe call. A key that Stripe itself rejects is the same situation as no key at all:
 * payments are not usable on this deployment, so the caller gets the honest 503.
 */
export async function callStripe<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) throw paymentsNotConfigured();
    const type = stripeErrorField(err, "type");
    if (type === "StripeAuthenticationError" || type === "StripePermissionError") {
      throw paymentsNotConfigured();
    }
    throw err;
  }
}
