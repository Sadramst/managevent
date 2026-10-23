import { describe, expect, it } from "vitest";
import {
  assertIntegerCents,
  assertNonNegativeCents,
  assertStripeTestModeKey,
  buildDefaultPaymentSchedule,
  buildTaxInvoice,
  canAddGuestsUnderPlan,
  createStripeTestConnectTransfer,
  createStripeTestPaymentIntent,
  divRoundHalfUp,
  formatAudCents,
  formatTaxInvoiceNumber,
  hasInvitationEntitlement,
  INVITATION_PLANS,
  priceLineFromUnitExGst,
  priceLineFromUnitIncGst,
  signStripeWebhookPayload,
  splitExGstCents,
  splitIncGstCents,
  splitSignedIncGstCents,
  sumPricedLines,
  verifyStripeWebhookSignature,
} from "./index.js";

const SAMPLE_UUID_V7 = "0192b400-0000-7000-8000-000000000001";

describe("@managevent/payments", () => {
  describe("Exhaustive GST rounding & AUD cents mathematics (PAYMENTS_AND_GST.md)", () => {
    it("rejects floats, NaN, and negative cent values where forbidden", () => {
      expect(() => assertIntegerCents(12.34)).toThrow(TypeError);
      expect(() => assertNonNegativeCents(-1)).toThrow(RangeError);
      expect(() => divRoundHalfUp(100, 0)).toThrow(RangeError);
      expect(divRoundHalfUp(0, 11)).toBe(0);
      expect(divRoundHalfUp(-110, 11)).toBe(-10);
      expect(divRoundHalfUp(-1, 11)).toBe(0);
    });

    it("exhaustively verifies inc->ex GST split (round(incGst / 11) half-up) for every remainder 0..10 mod 11", () => {
      // Remainders r = 0..5 round down; remainders r = 6..10 round up (since 6/11 = 0.5454... >= 0.5)
      const expectedGstFor0To10 = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
      for (let r = 0; r <= 10; r++) {
        const res = splitIncGstCents(r, "GST");
        expect(res.gstCents).toBe(expectedGstFor0To10[r]);
        expect(res.amountExGstCents + res.gstCents).toBe(r);
      }

      // Sweep 0..2,500 cents and verify invariants
      for (let inc = 0; inc <= 2500; inc++) {
        const split = splitIncGstCents(inc, "GST");
        expect(split.amountIncGstCents).toBe(inc);
        expect(split.amountExGstCents + split.gstCents).toBe(inc);
        expect(split.gstCents).toBe(Math.floor((inc * 2 + 11) / 22));
      }

      // Tax-free and input-taxed codes have 0 GST
      expect(splitIncGstCents(11000, "FRE")).toEqual({
        taxCode: "FRE",
        amountExGstCents: 11000,
        gstCents: 0,
        amountIncGstCents: 11000,
      });
      expect(splitIncGstCents(11000, "INP").gstCents).toBe(0);
    });

    it("exhaustively verifies ex->inc GST split (round(exGst * 0.1) half-up) for every remainder 0..9 mod 10", () => {
      // Remainders 0..4 round down; remainders 5..9 round up (half-up at .5!)
      const expectedGstFor0To9 = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
      for (let r = 0; r <= 9; r++) {
        const res = splitExGstCents(r, "GST");
        expect(res.gstCents).toBe(expectedGstFor0To9[r]);
        expect(res.amountIncGstCents).toBe(r + (expectedGstFor0To9[r] ?? 0));
      }

      expect(splitExGstCents(1000, "FRE")).toEqual({
        taxCode: "FRE",
        amountExGstCents: 1000,
        gstCents: 0,
        amountIncGstCents: 1000,
      });
    });

    it("calculates GST per line first and sums the line GST amounts (never rounding only at invoice total)", () => {
      // Three lines of 6 cents inc. GST:
      // Per-line: round(6 / 11) = 1 cent GST each -> sum of line GST = 3 cents!
      // (Whereas rounding total 18 / 11 would be 2 cents. Our rule requires per-line then sum = 3 cents.)
      const line1 = priceLineFromUnitIncGst({ qty: 1, unitPriceIncGstCents: 6 });
      const line2 = priceLineFromUnitIncGst({ qty: 1, unitPriceIncGstCents: 6 });
      const line3 = priceLineFromUnitIncGst({ qty: 1, unitPriceIncGstCents: 6 });

      const totals = sumPricedLines([line1, line2, line3]);
      expect(totals).toEqual({
        currency: "AUD",
        totalExGstCents: 15,
        gstCents: 3,
        totalIncGstCents: 18,
      });

      const exLine = priceLineFromUnitExGst({ qty: 3, unitPriceExGstCents: 105 });
      expect(exLine).toEqual({
        taxCode: "GST",
        amountExGstCents: 315,
        gstCents: 32, // 31.5 rounds half-up to 32
        amountIncGstCents: 347,
      });

      expect(() => priceLineFromUnitIncGst({ qty: -1, unitPriceIncGstCents: 100 })).toThrow(
        RangeError,
      );
      expect(() => priceLineFromUnitExGst({ qty: -1, unitPriceExGstCents: 100 })).toThrow(
        RangeError,
      );
      expect(() =>
        sumPricedLines([
          { taxCode: "GST", amountExGstCents: 10, gstCents: 5, amountIncGstCents: 20 },
        ]),
      ).toThrow();
    });

    it("splits signed GST deltas and formats AUD cents deterministically in Latin digits", () => {
      expect(splitSignedIncGstCents(-1100)).toEqual({
        taxCode: "GST",
        amountExGstCents: -1000,
        gstCents: -100,
        amountIncGstCents: -1100,
      });
      expect(splitSignedIncGstCents(-1100, "FRE").gstCents).toBe(0);

      expect(formatAudCents(125000)).toBe("$1,250");
      expect(formatAudCents(125050)).toBe("$1,250.50");
      expect(formatAudCents(125000, { showCents: true, suffixIncGst: true })).toBe(
        "$1,250.00 incl. GST",
      );
      expect(formatAudCents(-5000)).toBe("-$50");
    });
  });

  describe("ATO Tax Invoice model and payment schedule", () => {
    it("builds sequential gapless tax invoices and enforces ATO >= $1,000 buyer identity rule", () => {
      expect(formatTaxInvoiceNumber(1)).toBe("INV-000001");
      expect(formatTaxInvoiceNumber(42)).toBe("INV-000042");
      expect(() => formatTaxInvoiceNumber(0)).toThrow(RangeError);

      // Under $1,000 ($550.00): allowed without customerName
      const smallInvoice = buildTaxInvoice({
        id: `txi_${SAMPLE_UUID_V7}`,
        sequenceValue: 1,
        issuedAt: new Date("2026-10-23T04:00:00.000Z"),
        supplierAbn: "51 824 753 556",
        pdfMediaId: `med_${SAMPLE_UUID_V7}`,
        lines: [{ description: "Deposit", qty: 1, unitPriceIncGstCents: 55000 }],
      });
      expect(smallInvoice.number).toBe("INV-000001");
      expect(smallInvoice.gstCents).toBe(5000);
      expect(smallInvoice.totalExGstCents).toBe(50000);

      // >= $1,000 ($1,100.00) without customerName or customerAbn must throw
      expect(() =>
        buildTaxInvoice({
          id: `txi_${SAMPLE_UUID_V7}`,
          sequenceValue: 2,
          issuedAt: "2026-10-23T04:00:00.000Z",
          supplierAbn: "51 824 753 556",
          pdfMediaId: `med_${SAMPLE_UUID_V7}`,
          lines: [{ description: "Full Package", qty: 1, unitPriceIncGstCents: 110000 }],
        }),
      ).toThrow();

      // >= $1,000 with customerName succeeds
      const largeInvoice = buildTaxInvoice({
        id: `txi_${SAMPLE_UUID_V7}`,
        sequenceValue: 2,
        issuedAt: "2026-10-23T04:00:00.000Z",
        supplierAbn: "51 824 753 556",
        customerName: "Sara Ahmadi",
        customerAbn: "51 824 753 556",
        pdfMediaId: `med_${SAMPLE_UUID_V7}`,
        lines: [
          { description: "Full Package", qty: 1, unitPriceIncGstCents: 110000, taxCode: "GST" },
        ],
      });
      expect(largeInvoice.totalIncGstCents).toBe(110000);
    });

    it("computes the default 25% (min $500) / 50% / balance payment schedule", () => {
      expect(
        buildDefaultPaymentSchedule({
          totalIncGstCents: 0,
          eventStartsAt: new Date("2026-12-25T08:00:00.000Z"),
        }),
      ).toEqual([]);

      const schedule = buildDefaultPaymentSchedule({
        totalIncGstCents: 1_000_000, // $10,000
        eventStartsAt: new Date("2026-12-25T08:00:00.000Z"),
        now: new Date("2026-10-01T00:00:00.000Z"),
      });
      expect(schedule).toHaveLength(3);
      expect(schedule.map((s) => s.amountIncGstCents)).toEqual([250_000, 500_000, 250_000]);

      // Small order ($800) enforces $500 minimum deposit
      const smallSchedule = buildDefaultPaymentSchedule({
        totalIncGstCents: 80_000,
        eventStartsAt: new Date("2026-12-25T08:00:00.000Z"),
      });
      expect(smallSchedule[0]?.amountIncGstCents).toBe(50_000);
      expect(smallSchedule[1]?.amountIncGstCents).toBe(30_000);
    });
  });

  describe("Invitation plans & entitlements (WEBSITE.md §B14)", () => {
    it("enforces guest limits and feature entitlements across FREE, PREMIUM and AGENCY", () => {
      expect(INVITATION_PLANS.FREE.maxGuests).toBe(30);
      expect(canAddGuestsUnderPlan("FREE", 30)).toBe(true);
      expect(canAddGuestsUnderPlan("FREE", 31)).toBe(false);
      expect(canAddGuestsUnderPlan("PREMIUM", 500)).toBe(true);
      expect(canAddGuestsUnderPlan("AGENCY", 500)).toBe(true);

      expect(hasInvitationEntitlement("FREE", "qrPassesAndCheckin")).toBe(false);
      expect(hasInvitationEntitlement("PREMIUM", "qrPassesAndCheckin")).toBe(true);
      expect(hasInvitationEntitlement("PREMIUM", "automaticLogisticsBridge")).toBe(false);
      expect(hasInvitationEntitlement("AGENCY", "automaticLogisticsBridge")).toBe(true);
    });
  });

  describe("Stripe test-mode wrappers and webhook verification", () => {
    it("enforces sk_test_ keys and creates PaymentIntents and Connect transfers", () => {
      expect(() => assertStripeTestModeKey("sk_live_forbidden")).toThrow();
      expect(assertStripeTestModeKey("sk_test_123")).toBe("sk_test_123");

      expect(() =>
        createStripeTestPaymentIntent({
          amountIncGstCents: 0,
          kind: "DEPOSIT",
          method: "CARD",
          idempotencyKey: "idem_0",
        }),
      ).toThrow(RangeError);

      const pi = createStripeTestPaymentIntent({
        amountIncGstCents: 110_000,
        kind: "DEPOSIT",
        method: "AFTERPAY",
        idempotencyKey: "idem_1",
        orderId: `ord_${SAMPLE_UUID_V7}`,
      });
      expect(pi.paymentIntentId.startsWith("pi_test_")).toBe(true);
      expect(pi.gstCents).toBe(10_000);
      expect(pi.paymentMethodTypes).toEqual(["afterpay_clearpay"]);
      expect(pi.transferGroup).toBe(`order_ord_${SAMPLE_UUID_V7}`);

      expect(() =>
        createStripeTestConnectTransfer({
          paymentIntentId: pi.paymentIntentId,
          destinationStripeAccountId: "acct_test_1",
          amountCents: 0,
          transferGroup: "grp_1",
          idempotencyKey: "tr_idem_0",
        }),
      ).toThrow(RangeError);

      const tr = createStripeTestConnectTransfer({
        paymentIntentId: pi.paymentIntentId,
        destinationStripeAccountId: "acct_test_1",
        amountCents: 80_000,
        transferGroup: "grp_1",
        idempotencyKey: "tr_idem_1",
      });
      expect(tr.transferId.startsWith("tr_test_")).toBe(true);
      expect(tr.livemode).toBe(false);
    });

    it("signs and verifies Stripe webhook signatures and rejects tampered/expired payloads", () => {
      const rawBody = JSON.stringify({ id: "evt_test_1", type: "payment_intent.succeeded" });
      const secret = "whsec_unit_test_secret";
      const nowSec = 1792713600;
      const header = signStripeWebhookPayload(rawBody, secret, nowSec);

      const verified = verifyStripeWebhookSignature({
        rawBody,
        signatureHeader: header,
        webhookSecret: secret,
        nowSec,
      });
      expect(verified).toEqual({ verified: true, timestampSec: nowSec });

      // Tampered body
      expect(() =>
        verifyStripeWebhookSignature({
          rawBody: `${rawBody} `,
          signatureHeader: header,
          webhookSecret: secret,
          nowSec,
        }),
      ).toThrow("Invalid Stripe webhook signature");

      // Expired timestamp
      expect(() =>
        verifyStripeWebhookSignature({
          rawBody,
          signatureHeader: header,
          webhookSecret: secret,
          nowSec: nowSec + 1000,
        }),
      ).toThrow("Stripe webhook timestamp outside tolerance window");

      // Malformed header
      expect(() =>
        verifyStripeWebhookSignature({
          rawBody,
          signatureHeader: "bad_header",
          webhookSecret: secret,
          nowSec,
        }),
      ).toThrow("Malformed Stripe-Signature header");
    });
  });
});
