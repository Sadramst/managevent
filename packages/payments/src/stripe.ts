/**
 * Stripe and Stripe Connect wrappers (test mode only in non-production environments)
 * and webhook HMAC-SHA256 signature verification (`docs/compliance/PAYMENTS_AND_GST.md`, D-07, D-08).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentKind, PaymentMethod } from "@managevent/types";
import { assertNonNegativeCents, splitIncGstCents } from "./gst.js";

/**
 * Asserts that a Stripe secret key is a test-mode key (`sk_test_...`) in non-production environments.
 */
export function assertStripeTestModeKey(secretKey?: string): string {
  const resolved = secretKey ?? process.env.STRIPE_SECRET_KEY ?? "sk_test_mock_local_only";
  if (!resolved.startsWith("sk_test_")) {
    throw new Error(
      "Stripe wrapper is restricted to test mode (key must start with 'sk_test_') in non-production environments",
    );
  }
  return resolved;
}

export interface CreateStripePaymentIntentParams {
  amountIncGstCents: number;
  kind: PaymentKind;
  method: PaymentMethod;
  idempotencyKey: string;
  orderId?: string;
  invitationId?: string;
  secretKey?: string;
}

export interface StripePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  currency: "aud";
  amountIncGstCents: number;
  amountExGstCents: number;
  gstCents: number;
  paymentMethodTypes: string[];
  transferGroup?: string;
  livemode: false;
}

/**
 * Creates a deterministic Stripe PaymentIntent descriptor in test mode (AUD, GST split calculated via `splitIncGstCents`).
 * Supports separate charges and transfers via `transferGroup` (`OPEN_DECISIONS.md` D-07).
 */
export function createStripeTestPaymentIntent(
  params: CreateStripePaymentIntentParams,
): StripePaymentIntentResult {
  assertStripeTestModeKey(params.secretKey);
  assertNonNegativeCents(params.amountIncGstCents, "amountIncGstCents");
  if (params.amountIncGstCents === 0) {
    throw new RangeError("PaymentIntent amount must be > 0 cents");
  }

  const gstSplit = splitIncGstCents(params.amountIncGstCents, "GST");
  const digest = createHmac("sha256", "managevent-stripe-test")
    .update(`${params.idempotencyKey}:${params.amountIncGstCents}:${params.kind}`)
    .digest("hex")
    .slice(0, 24);

  const methodType = params.method === "AFTERPAY" ? "afterpay_clearpay" : "card";

  return {
    paymentIntentId: `pi_test_${digest}`,
    clientSecret: `pi_test_${digest}_secret_${digest.slice(0, 12)}`,
    currency: "aud",
    amountIncGstCents: gstSplit.amountIncGstCents,
    amountExGstCents: gstSplit.amountExGstCents,
    gstCents: gstSplit.gstCents,
    paymentMethodTypes: [methodType],
    ...(params.orderId ? { transferGroup: `order_${params.orderId}` } : {}),
    livemode: false,
  };
}

export interface CreateStripeConnectTransferParams {
  paymentIntentId: string;
  destinationStripeAccountId: string;
  amountCents: number;
  transferGroup: string;
  idempotencyKey: string;
  secretKey?: string;
}

export interface StripeConnectTransferResult {
  transferId: string;
  destinationStripeAccountId: string;
  amountCents: number;
  currency: "aud";
  transferGroup: string;
  livemode: false;
}

/**
 * Creates a Stripe Connect transfer in test mode (separate charges and transfers model, D-07).
 */
export function createStripeTestConnectTransfer(
  params: CreateStripeConnectTransferParams,
): StripeConnectTransferResult {
  assertStripeTestModeKey(params.secretKey);
  assertNonNegativeCents(params.amountCents, "amountCents");
  if (params.amountCents === 0) {
    throw new RangeError("Transfer amount must be > 0 cents");
  }

  const digest = createHmac("sha256", "managevent-stripe-transfer-test")
    .update(`${params.idempotencyKey}:${params.destinationStripeAccountId}:${params.amountCents}`)
    .digest("hex")
    .slice(0, 24);

  return {
    transferId: `tr_test_${digest}`,
    destinationStripeAccountId: params.destinationStripeAccountId,
    amountCents: params.amountCents,
    currency: "aud",
    transferGroup: params.transferGroup,
    livemode: false,
  };
}

/**
 * Signs a raw webhook payload using Stripe's `t=<timestamp>,v1=<hmac>` scheme (useful for tests).
 */
export function signStripeWebhookPayload(
  rawPayload: string,
  webhookSecret: string,
  timestampSec: number = Math.floor(Date.now() / 1000),
): string {
  const signedPayload = `${timestampSec}.${rawPayload}`;
  const sig = createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");
  return `t=${timestampSec},v1=${sig}`;
}

/**
 * Verifies a Stripe `Stripe-Signature` header against the raw request body and tolerance window.
 */
export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret?: string;
  nowSec?: number;
  toleranceSec?: number;
}): { verified: true; timestampSec: number } {
  const secret =
    params.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_mock_local_only";
  const parts = params.signatureHeader.split(",");
  let timestampStr: string | undefined;
  let v1Sig: string | undefined;

  for (const part of parts) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t") timestampStr = v;
    if (k === "v1") v1Sig = v;
  }

  if (!timestampStr || !v1Sig) {
    throw new Error("Malformed Stripe-Signature header");
  }

  const timestampSec = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestampSec)) {
    throw new Error("Invalid timestamp in Stripe-Signature header");
  }

  const nowSec = params.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = params.toleranceSec ?? 300;
  if (Math.abs(nowSec - timestampSec) > tolerance) {
    throw new Error("Stripe webhook timestamp outside tolerance window");
  }

  const expectedHex = createHmac("sha256", secret)
    .update(`${timestampSec}.${params.rawBody}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = Buffer.from(v1Sig, "hex");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error("Invalid Stripe webhook signature");
  }

  return { verified: true, timestampSec };
}
