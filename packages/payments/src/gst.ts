/**
 * Money (AUD integer cents) and Australian GST (10%) mathematics (`docs/compliance/PAYMENTS_AND_GST.md`).
 *
 * This module is the ONLY place in the monorepo where GST is calculated.
 * Never inline `* 1.1` or `/ 11` anywhere else.
 */
import type { TaxCode } from "@managevent/types";

export interface PricedLineAmounts {
  taxCode: TaxCode;
  amountExGstCents: number;
  gstCents: number;
  amountIncGstCents: number;
}

export interface PricedInvoiceTotals {
  currency: "AUD";
  totalExGstCents: number;
  gstCents: number;
  totalIncGstCents: number;
}

/**
 * Asserts that `cents` is a safe integer (never a float or NaN).
 */
export function assertIntegerCents(cents: number, label: string = "amountCents"): void {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError(`${label} must be a safe integer number of cents, received: ${cents}`);
  }
}

/**
 * Asserts that `cents` is a non-negative safe integer.
 */
export function assertNonNegativeCents(cents: number, label: string = "amountCents"): void {
  assertIntegerCents(cents, label);
  if (cents < 0) {
    throw new RangeError(`${label} must be >= 0 cents, received: ${cents}`);
  }
}

/**
 * Pure integer half-up division `round(numerator / denominator)` for non-negative integers.
 * For negative integers, rounds half away from zero (`-round(|n| / d)`).
 */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  assertIntegerCents(numerator, "numerator");
  assertIntegerCents(denominator, "denominator");
  if (denominator <= 0) {
    throw new RangeError("denominator must be > 0");
  }
  if (numerator >= 0) {
    return Math.floor((numerator * 2 + denominator) / (denominator * 2));
  }
  const abs = -numerator;
  const roundedAbs = Math.floor((abs * 2 + denominator) / (denominator * 2));
  return roundedAbs === 0 ? 0 : -roundedAbs;
}

/**
 * Splits a GST-inclusive line amount (in cents) into `{ amountExGstCents, gstCents, amountIncGstCents }`.
 *
 * Per `docs/compliance/PAYMENTS_AND_GST.md`:
 * - For `taxCode = "GST"`: `gst = roundHalfUp(incGst / 11)`, `exGst = incGst - gst`.
 * - For `taxCode = "FRE"` or `"INP"`: `gst = 0`, `exGst = incGst`.
 */
export function splitIncGstCents(
  amountIncGstCents: number,
  taxCode: TaxCode = "GST",
): PricedLineAmounts {
  assertNonNegativeCents(amountIncGstCents, "amountIncGstCents");
  const gstCents = taxCode === "GST" ? divRoundHalfUp(amountIncGstCents, 11) : 0;
  const amountExGstCents = amountIncGstCents - gstCents;
  return {
    taxCode,
    amountExGstCents,
    gstCents,
    amountIncGstCents,
  };
}

/**
 * Splits a Signed GST-inclusive delta (in cents) into `{ amountExGstCents, gstCents, amountIncGstCents }`.
 */
export function splitSignedIncGstCents(
  deltaIncGstCents: number,
  taxCode: TaxCode = "GST",
): PricedLineAmounts {
  assertIntegerCents(deltaIncGstCents, "deltaIncGstCents");
  const gstCents = taxCode === "GST" ? divRoundHalfUp(deltaIncGstCents, 11) : 0;
  const amountExGstCents = deltaIncGstCents - gstCents;
  return {
    taxCode,
    amountExGstCents,
    gstCents,
    amountIncGstCents: deltaIncGstCents,
  };
}

/**
 * Calculates GST and GST-inclusive amount from an ex-GST line amount (in cents).
 *
 * Per `docs/compliance/PAYMENTS_AND_GST.md`:
 * - For `taxCode = "GST"`: `gst = roundHalfUp(exGst / 10)` (`round(exGst × 0.1)`), `incGst = exGst + gst`.
 * - For `taxCode = "FRE"` or `"INP"`: `gst = 0`, `incGst = exGst`.
 */
export function splitExGstCents(
  amountExGstCents: number,
  taxCode: TaxCode = "GST",
): PricedLineAmounts {
  assertNonNegativeCents(amountExGstCents, "amountExGstCents");
  const gstCents = taxCode === "GST" ? divRoundHalfUp(amountExGstCents, 10) : 0;
  const amountIncGstCents = amountExGstCents + gstCents;
  return {
    taxCode,
    amountExGstCents,
    gstCents,
    amountIncGstCents,
  };
}

/**
 * Prices a line item entered with a GST-inclusive unit price (`qty * unitPriceIncGstCents`).
 */
export function priceLineFromUnitIncGst(params: {
  qty: number;
  unitPriceIncGstCents: number;
  taxCode?: TaxCode;
}): PricedLineAmounts {
  assertIntegerCents(params.qty, "qty");
  if (params.qty < 0) {
    throw new RangeError("qty must be >= 0");
  }
  assertNonNegativeCents(params.unitPriceIncGstCents, "unitPriceIncGstCents");
  const lineInc = params.qty * params.unitPriceIncGstCents;
  return splitIncGstCents(lineInc, params.taxCode ?? "GST");
}

/**
 * Prices a line item entered with an ex-GST unit price (`qty * unitPriceExGstCents`).
 */
export function priceLineFromUnitExGst(params: {
  qty: number;
  unitPriceExGstCents: number;
  taxCode?: TaxCode;
}): PricedLineAmounts {
  assertIntegerCents(params.qty, "qty");
  if (params.qty < 0) {
    throw new RangeError("qty must be >= 0");
  }
  assertNonNegativeCents(params.unitPriceExGstCents, "unitPriceExGstCents");
  const lineEx = params.qty * params.unitPriceExGstCents;
  return splitExGstCents(lineEx, params.taxCode ?? "GST");
}

/**
 * Sums pre-rounded line amounts.
 *
 * Per `docs/compliance/PAYMENTS_AND_GST.md`:
 * "Rounding: calculate GST for each line, then sum the lines. The invoice total GST is the sum of the line GST amounts."
 */
export function sumPricedLines(lines: readonly PricedLineAmounts[]): PricedInvoiceTotals {
  let totalExGstCents = 0;
  let gstCents = 0;
  let totalIncGstCents = 0;

  for (const line of lines) {
    assertNonNegativeCents(line.amountExGstCents, "line.amountExGstCents");
    assertNonNegativeCents(line.gstCents, "line.gstCents");
    assertNonNegativeCents(line.amountIncGstCents, "line.amountIncGstCents");
    if (line.amountExGstCents + line.gstCents !== line.amountIncGstCents) {
      throw new Error(
        `Inconsistent line amounts: ex (${line.amountExGstCents}) + gst (${line.gstCents}) !== inc (${line.amountIncGstCents})`,
      );
    }
    totalExGstCents += line.amountExGstCents;
    gstCents += line.gstCents;
    totalIncGstCents += line.amountIncGstCents;
  }

  return {
    currency: "AUD",
    totalExGstCents,
    gstCents,
    totalIncGstCents,
  };
}

/**
 * Deterministically formats AUD cents as a consumer display string in Latin digits (e.g. `$1,250.00 incl. GST`).
 * Never uses `Intl` so SSR and client hydration are identical.
 */
export function formatAudCents(
  amountCents: number,
  options?: { showCents?: boolean; suffixIncGst?: boolean },
): string {
  assertIntegerCents(amountCents, "amountCents");
  const isNegative = amountCents < 0;
  const abs = Math.abs(amountCents);
  const dollars = Math.floor(abs / 100);
  const cents = abs % 100;

  const dollarsWithCommas = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const showCents = options?.showCents ?? cents !== 0;
  const centsPart = showCents ? `.${String(cents).padStart(2, "0")}` : "";
  const sign = isNegative ? "-" : "";
  const suffix = options?.suffixIncGst ? " incl. GST" : "";

  return `${sign}$${dollarsWithCommas}${centsPart}${suffix}`;
}
