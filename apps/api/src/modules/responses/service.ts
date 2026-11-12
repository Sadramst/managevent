/**
 * Responses for hosts: the RSVP summary (`guest:read`) and the per-guest dietary matrix
 * (`health:read`, audit-logged when the permission says so).
 */
import type { AuthActor } from "@managevent/auth";
import type { DietaryMatrix, ResponsesSummary } from "@managevent/validators";
import { checkHostPermission, requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { hasLinkedOrder, loadLatestHeadcount, loadResponseParties } from "./repo.js";
import { buildDietaryMatrix, buildResponsesSummary } from "./summary.js";

export function createResponsesService(deps: ApiDeps) {
  return {
    /**
     * The summary is a `guest:read` page, but its dietary counts and severe-allergy count are
     * health information: next to the list of recent responses they can be pinned on a named
     * guest. A caller without `health:read` (a VIEWER co-host) gets zeroes, and the health
     * columns are neither selected nor decrypted for them.
     */
    async getSummary(
      ctx: { actor: AuthActor | null; ip?: string },
      eventId: string,
    ): Promise<ResponsesSummary> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:read");
      const health = checkHostPermission(ctx.actor, "health:read", access.scope);
      const [parties, headcount, linkedOrder] = await Promise.all([
        loadResponseParties(deps.db, access.invitation.id, { includeHealth: health.allowed }),
        loadLatestHeadcount(deps.db, eventId),
        hasLinkedOrder(deps.db, eventId),
      ]);
      // Staff and admin access to health information is always recorded (PERMISSIONS.md).
      if (health.allowed && health.auditLogged) {
        await writeAudit(deps.db, {
          actor: ctx.actor,
          action: "health.read",
          entity: "Event",
          entityId: eventId,
          diff: { via: "responses.summary", detail: "counts" },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
      }
      return buildResponsesSummary(parties, {
        now: deps.now(),
        timeZone: access.event.timeZone,
        rsvpDeadline: access.invitation.rsvpDeadline,
        latestHeadcount: headcount
          ? {
              id: headcount.id,
              takenAt: headcount.takenAt.toISOString(),
              trigger: headcount.trigger,
            }
          : null,
        linkedOrder,
      });
    },

    async getDietary(
      ctx: { actor: AuthActor | null; ip?: string },
      eventId: string,
    ): Promise<DietaryMatrix> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "health:read");
      const matrix = buildDietaryMatrix(
        await loadResponseParties(deps.db, access.invitation.id, { includeHealth: true }),
      );

      // Staff and admin access to health information is always recorded (PERMISSIONS.md).
      if (access.decision.auditLogged) {
        await writeAudit(deps.db, {
          actor: ctx.actor,
          action: "health.read",
          entity: "Event",
          entityId: eventId,
          diff: { via: "responses.dietary", guests: matrix.rows.length },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
      }
      return matrix;
    },
  };
}

export type ResponsesService = ReturnType<typeof createResponsesService>;
