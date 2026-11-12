/**
 * Test-only helpers for host-facing routes: users created straight in the database, and an app
 * whose actor comes from a test header instead of a Better Auth session.
 *
 * The database is shared. Everything here is created with fresh unique ids and `cleanup()`
 * removes exactly those rows (and what hangs off the events those users created).
 */
import type { AuthActor } from "@managevent/auth";
import { db, generateId, type Role } from "@managevent/db";
import { createApiApp } from "../app.js";
import { InMemoryJobQueue } from "../lib/queue.js";
import { deleteRsvpSubmissionsOfInvitations, TEST_CLIENT_IP, uniqueTestSuffix } from "./db.js";

export const TEST_ACTOR_HEADER = "x-test-actor";

export interface TestUser {
  id: string;
  email: string;
  actor: AuthActor;
  /** Deletes the user, every event they own, and the audit and payment rows of those events. */
  cleanup: () => Promise<void>;
}

export async function createTestUser(roles: Role[] = ["CUSTOMER_HOST"]): Promise<TestUser> {
  const id = generateId("usr_");
  const email = `host-${uniqueTestSuffix()}@test.managevent.invalid`;
  await db.user.create({ data: { id, email, name: "Test Host", roles } });

  return {
    id,
    email,
    actor: { userId: id, roles, mfaVerified: false },
    cleanup: async () => {
      const events = await db.event.findMany({
        where: { ownerUserId: id },
        select: { id: true, invitation: { select: { id: true } } },
      });
      const eventIds = events.map((event) => event.id);
      const invitationIds = events.flatMap((event) =>
        event.invitation ? [event.invitation.id] : [],
      );
      // Rows without a cascading foreign key to the event go first.
      await deleteRsvpSubmissionsOfInvitations(invitationIds);
      await db.message.deleteMany({ where: { eventId: { in: eventIds } } });
      await db.payment.deleteMany({ where: { invitationId: { in: invitationIds } } });
      await db.auditLog.deleteMany({
        where: {
          OR: [{ actorUserId: id }, { entityId: { in: [id, ...eventIds, ...invitationIds] } }],
        },
      });
      await db.event.deleteMany({ where: { id: { in: eventIds } } });
      await db.user.deleteMany({ where: { id } });
    },
  };
}

/**
 * The full API app with rate limits off and an in-memory queue. A request acts as the user whose
 * id is in the `x-test-actor` header, if that user was registered with `actAs`; otherwise it is
 * anonymous. This resolver exists only in tests: the real app never trusts identity headers.
 */
export function createHostTestApp() {
  const actors = new Map<string, AuthActor>();
  const queue = new InMemoryJobQueue();
  const app = createApiApp({
    deps: { queue },
    disableRateLimits: true,
    clientIp: TEST_CLIENT_IP,
    resolveActor: async (request) =>
      actors.get(request.headers.get(TEST_ACTOR_HEADER) ?? "") ?? null,
  });

  return {
    app,
    queue,
    /** Registers the user and returns the headers that make a request act as them. */
    actAs(user: Pick<TestUser, "id" | "actor">): Record<string, string> {
      actors.set(user.id, user.actor);
      return { [TEST_ACTOR_HEADER]: user.id };
    },
  };
}

export function jsonRequest(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  };
}
