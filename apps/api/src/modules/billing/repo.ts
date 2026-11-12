/**
 * Prisma access for plan usage, the Premium Event Pass payment and stored webhook events.
 */
import { generateId, type InvitationPlan, type Prisma } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";
import { isUniqueViolation } from "../../lib/errors.js";

/** What counts against the plan limits: live guests on the list, and emails really sent. */
export async function countPlanUsage(
  db: DbTx,
  invitationId: string,
  eventId: string,
): Promise<{ guests: number; emailsSent: number }> {
  const [guests, emailsSent] = await Promise.all([
    db.guest.count({
      where: { deletedAt: null, party: { invitationId, deletedAt: null } },
    }),
    db.message.count({ where: { eventId, status: "SENT" } }),
  ]);
  return { guests, emailsSent };
}

/** The invitation a payment belongs to. Soft-deleted rows are returned: money still needs a home. */
export async function findInvitationForPayment(
  tx: DbTx,
  invitationId: string,
): Promise<{ id: string; eventId: string; plan: InvitationPlan } | null> {
  // Row lock: payments for one invitation are applied one at a time.
  await tx.$queryRaw`SELECT 1 FROM "Invitation" WHERE "id" = ${invitationId} FOR NO KEY UPDATE`;
  return tx.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, eventId: true, plan: true },
  });
}

export interface InvitationPassPayment {
  invitationId: string;
  amountExGstCents: number;
  gstCents: number;
  amountIncGstCents: number;
  stripePaymentIntentId: string;
  idempotencyKey: string;
  paidAt: Date;
}

/** Records the succeeded card payment. Unique on the payment intent and on the idempotency key. */
export async function createInvitationPassPayment(
  tx: DbTx,
  payment: InvitationPassPayment,
): Promise<{ id: string }> {
  const id = generateId("pay_");
  await tx.payment.create({
    data: {
      id,
      invitationId: payment.invitationId,
      kind: "INVITATION_PASS",
      status: "SUCCEEDED",
      currency: "AUD",
      amountExGstCents: payment.amountExGstCents,
      amountIncGstCents: payment.amountIncGstCents,
      gstCents: payment.gstCents,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      method: "CARD",
      idempotencyKey: payment.idempotencyKey,
      paidAt: payment.paidAt,
    },
  });
  return { id };
}

const CHECKOUT_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Checkout Sessions started for an invitation that can still be open (Stripe closes a session
 * after 24 hours by itself). The ids come from the `plan.checkout_started` audit rows: a
 * `Payment` row only exists once Stripe reports a payment, so there is nowhere else to look.
 */
export async function listRecentCheckoutSessionIds(
  db: DbTx,
  invitationId: string,
  now: Date,
): Promise<string[]> {
  const rows = await db.auditLog.findMany({
    where: {
      entity: "Invitation",
      entityId: invitationId,
      action: "plan.checkout_started",
      at: { gte: new Date(now.getTime() - CHECKOUT_SESSION_LIFETIME_MS) },
    },
    orderBy: { at: "desc" },
    take: 50,
    select: { diffJson: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    const diff = row.diffJson;
    if (typeof diff !== "object" || diff === null || Array.isArray(diff)) continue;
    const sessionId = (diff as Record<string, unknown>).checkoutSessionId;
    if (typeof sessionId === "string" && sessionId.length > 0) ids.add(sessionId);
  }
  return [...ids];
}

/**
 * Moves the invitation to `plan`. A no-op when it is already on that plan: the row, including
 * `updatedAt`, is left untouched. Returns whether the plan changed.
 */
export async function setInvitationPlan(
  tx: DbTx,
  invitationId: string,
  plan: InvitationPlan,
): Promise<boolean> {
  const { count } = await tx.invitation.updateMany({
    where: { id: invitationId, plan: { not: plan } },
    data: { plan },
  });
  return count > 0;
}

export async function findUserRoles(db: DbTx, userId: string) {
  return db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, roles: true },
  });
}

/**
 * Stores a verified provider event once. Returns the stored row's id and whether an earlier
 * delivery of the same event has already been processed.
 */
export async function claimWebhookEvent(
  db: DbTx,
  event: { provider: string; providerEventId: string; type: string; payload: unknown },
  receivedAt: Date,
): Promise<{ id: string; alreadyProcessed: boolean }> {
  const id = generateId("whk_");
  try {
    await db.webhookEvent.create({
      data: {
        id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        type: event.type,
        payloadJson: event.payload as Prisma.InputJsonValue,
        receivedAt,
      },
    });
    return { id, alreadyProcessed: false };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const existing = await db.webhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: event.provider,
          providerEventId: event.providerEventId,
        },
      },
      select: { id: true, processedAt: true },
    });
    if (!existing) throw err;
    return { id: existing.id, alreadyProcessed: existing.processedAt !== null };
  }
}

export async function markWebhookEventProcessed(db: DbTx, id: string, at: Date): Promise<void> {
  await db.webhookEvent.update({ where: { id }, data: { processedAt: at } });
}
