/**
 * Append-only audit trail. Call inside the same transaction as the change it records.
 * The diff is passed through `redactForLog`, so tokens, contact details and health data never
 * reach the `AuditLog` table even if a caller passes them by mistake.
 */
import type { AuthActor } from "@managevent/auth";
import { redactForLog } from "@managevent/config";
import { generateId, type Prisma } from "@managevent/db";
import type { DbTx } from "./deps.js";

export async function writeAudit(
  tx: DbTx,
  entry: {
    actor: AuthActor | null;
    action: string;
    entity: string;
    entityId: string;
    diff: Record<string, unknown>;
    ip?: string;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: generateId("aud_"),
      actorUserId: entry.actor?.userId ?? null,
      actorRole: entry.actor?.roles[0] ?? "GUEST",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      diffJson: redactForLog(entry.diff) as Prisma.InputJsonValue,
      ip: entry.ip ?? null,
    },
  });
}
