/**
 * ATO-compliant Tax Invoice model, gapless numbering helper, and default payment schedule (`PAYMENTS_AND_GST.md` & `PRICING_MODEL.md`).
 */
import type { TaxCode, TaxInvoice, TaxInvoiceLine } from "@managevent/types";
import { TaxInvoiceSchema } from "@managevent/validators";
import {
  assertNonNegativeCents,
  divRoundHalfUp,
  priceLineFromUnitIncGst,
  sumPricedLines,
} from "./gst.js";

/**
 * Formats a positive integer sequence value into a gapless sequential tax invoice number (e.g. `INV-000001`).
 */
export function formatTaxInvoiceNumber(sequenceValue: number): string {
  if (!Number.isSafeInteger(sequenceValue) || sequenceValue <= 0) {
    throw new RangeError(`sequenceValue must be a positive integer, received: ${sequenceValue}`);
  }
  return `INV-${String(sequenceValue).padStart(6, "0")}`;
}

export interface CreateTaxInvoiceInput {
  id: string;
  sequenceValue: number;
  issuedAt: Date | string;
  supplierName?: string;
  supplierAbn: string;
  customerName?: string;
  customerAbn?: string;
  pdfMediaId: string;
  lines: ReadonlyArray<{
    description: string;
    qty: number;
    unitPriceIncGstCents: number;
    taxCode?: TaxCode;
  }>;
}

/**
 * Builds and validates an ATO-compliant `TaxInvoice` using per-line GST rounding and summation.
 */
export function buildTaxInvoice(input: CreateTaxInvoiceInput): TaxInvoice {
  const pricedLines: TaxInvoiceLine[] = input.lines.map((line) => {
    const taxCode: TaxCode = line.taxCode ?? "GST";
    const amounts = priceLineFromUnitIncGst({
      qty: line.qty,
      unitPriceIncGstCents: line.unitPriceIncGstCents,
      taxCode,
    });
    return {
      description: line.description,
      qty: line.qty,
      unitPriceIncGstCents: line.unitPriceIncGstCents,
      taxCode,
      amountExGstCents: amounts.amountExGstCents,
      gstCents: amounts.gstCents,
      amountIncGstCents: amounts.amountIncGstCents,
    };
  });

  const totals = sumPricedLines(pricedLines);
  const issuedAtIso =
    typeof input.issuedAt === "string" ? input.issuedAt : input.issuedAt.toISOString();

  return TaxInvoiceSchema.parse({
    id: input.id,
    number: formatTaxInvoiceNumber(input.sequenceValue),
    title: "Tax invoice",
    issuedAt: issuedAtIso,
    supplierName: input.supplierName ?? "Managevent (Appilico)",
    supplierAbn: input.supplierAbn,
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.customerAbn ? { customerAbn: input.customerAbn } : {}),
    currency: "AUD",
    lines: pricedLines,
    totalExGstCents: totals.totalExGstCents,
    gstCents: totals.gstCents,
    totalIncGstCents: totals.totalIncGstCents,
    pdfMediaId: input.pdfMediaId,
  });
}

export interface PaymentScheduleMilestone {
  kind: "DEPOSIT" | "MILESTONE" | "BALANCE";
  dueAt: string;
  amountIncGstCents: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Computes the default 3-part agency payment schedule (`docs/business/PRICING_MODEL.md`):
 * 1. Deposit: 25% (min $500 / 50,000 cents, capped at totalIncGstCents) due immediately.
 * 2. Milestone 2: 50% due 8 weeks (56 days) before the event.
 * 3. Balance: Remainder due 7 days before the event.
 */
export function buildDefaultPaymentSchedule(params: {
  totalIncGstCents: number;
  eventStartsAt: Date;
  now?: Date;
  depositPercent?: number;
  depositMinCents?: number;
}): PaymentScheduleMilestone[] {
  assertNonNegativeCents(params.totalIncGstCents, "totalIncGstCents");
  const now = params.now ?? new Date();
  const depositPercent = params.depositPercent ?? 25;
  const depositMinCents = params.depositMinCents ?? 50_000;

  if (params.totalIncGstCents === 0) {
    return [];
  }

  const rawDeposit = divRoundHalfUp(params.totalIncGstCents * depositPercent, 100);
  const depositCents = Math.min(params.totalIncGstCents, Math.max(rawDeposit, depositMinCents));

  const remainingAfterDeposit = params.totalIncGstCents - depositCents;
  const rawMilestone = divRoundHalfUp(params.totalIncGstCents * 50, 100);
  const milestoneCents = Math.min(remainingAfterDeposit, rawMilestone);
  const balanceCents = remainingAfterDeposit - milestoneCents;

  const eightWeeksBefore = new Date(params.eventStartsAt.getTime() - 56 * DAY_MS);
  const sevenDaysBefore = new Date(params.eventStartsAt.getTime() - 7 * DAY_MS);

  const items: PaymentScheduleMilestone[] = [
    {
      kind: "DEPOSIT",
      dueAt: now.toISOString(),
      amountIncGstCents: depositCents,
    },
  ];

  if (milestoneCents > 0) {
    items.push({
      kind: "MILESTONE",
      dueAt: eightWeeksBefore.toISOString(),
      amountIncGstCents: milestoneCents,
    });
  }

  if (balanceCents > 0) {
    items.push({
      kind: "BALANCE",
      dueAt: sevenDaysBefore.toISOString(),
      amountIncGstCents: balanceCents,
    });
  }

  return items;
}
