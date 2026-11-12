/**
 * Test-only fixtures for the guest-site, check-in and well suites.
 *
 * The local database is shared. Everything here is created with fresh unique ids under an event
 * from `createEventFixture`, and `cleanupEventFixture` removes exactly those rows.
 */
import type { AuthActor } from "@managevent/auth";
import { db, generateId, type Prisma } from "@managevent/db";
import { createApiApp } from "../../app.js";
import { buildPartyToken, generateStableId } from "../../lib/guest-tokens.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
import {
  createEventFixture,
  type EventFixture,
  TEST_CLIENT_IP,
  uniqueTestSuffix,
} from "../../test/db.js";

export interface PartyFixture {
  partyId: string;
  token: string;
  displayName: string;
  guestIds: string[];
}

export interface PartyFixtureInput {
  displayName: string;
  guests: Array<{ name: string; isChild?: boolean; email?: string; phone?: string }>;
  maxSeats?: number;
  allowPlusOnes?: boolean;
  childrenAllowed?: boolean;
  tableLabel?: string;
}

/** Creates a party with its guests directly in the database, with a real derived token. */
export async function createPartyFixture(
  fixture: EventFixture,
  input: PartyFixtureInput,
): Promise<PartyFixture> {
  const partyId = generateId("pty_");
  const stableId = generateStableId();
  const token = buildPartyToken(input.displayName, fixture.salt, stableId, 0);
  await db.party.create({
    data: {
      id: partyId,
      invitationId: fixture.invitationId,
      stableId,
      displayName: { en: input.displayName },
      token,
      maxSeats: input.maxSeats ?? Math.max(1, input.guests.length),
      allowPlusOnes: input.allowPlusOnes ?? false,
      childrenAllowed: input.childrenAllowed ?? true,
      tags: [],
      tableLabel: input.tableLabel ?? null,
    },
  });
  const guestIds: string[] = [];
  for (const guest of input.guests) {
    const id = generateId("gst_");
    await db.guest.create({
      data: {
        id,
        partyId,
        stableId: generateStableId(),
        name: { en: guest.name },
        isChild: guest.isChild ?? false,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
      },
    });
    guestIds.push(id);
  }
  return { partyId, token, displayName: input.displayName, guestIds };
}

/** Updates the fixture's invitation (for example its `rsvpConfigJson` or `wellConfigJson`). */
export async function updateInvitationFixture(
  fixture: EventFixture,
  data: Prisma.InvitationUpdateInput,
): Promise<void> {
  await db.invitation.update({ where: { id: fixture.invitationId }, data });
}

/** A second host account, for "someone else's session" cases. Remove with `removeUsers`. */
export async function createUserFixture(
  roles: Array<"CUSTOMER_HOST" | "PLANNER_STAFF" | "CHECKIN_CREW" | "SUPER_ADMIN"> = [
    "CUSTOMER_HOST",
  ],
): Promise<string> {
  const id = generateId("usr_");
  await db.user.create({
    data: {
      id,
      email: `e2-${uniqueTestSuffix()}@test.managevent.invalid`,
      name: "Test Person",
      roles,
    },
  });
  return id;
}

export async function removeUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

/**
 * Removes an event fixture and the rows the guest site wrote for it that have no foreign key to
 * the event (consent records and audit rows about its well entries).
 */
export async function cleanupEventFixture(fixture: EventFixture): Promise<void> {
  const guests = await db.guest.findMany({
    where: { party: { invitationId: fixture.invitationId } },
    select: { id: true },
  });
  const entries = await db.wellEntry.findMany({
    where: { invitationId: fixture.invitationId },
    select: { id: true },
  });
  if (guests.length > 0) {
    await db.consentRecord.deleteMany({
      where: { subjectType: "GUEST", subjectId: { in: guests.map((guest) => guest.id) } },
    });
  }
  if (entries.length > 0) {
    await db.auditLog.deleteMany({
      where: { entity: "WellEntry", entityId: { in: entries.map((entry) => entry.id) } },
    });
  }
  await fixture.cleanup();
}

export interface TestApi {
  app: ReturnType<typeof createApiApp>;
  queue: InMemoryJobQueue;
  /** The session the next requests run as (null = signed out). */
  setActor(actor: AuthActor | null): void;
  /** Moves the API clock; null returns to the real time. */
  setNow(now: Date | null): void;
  request(path: string, init?: RequestInit): Promise<Response>;
  json(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
}

/** The real app on the real database, with an in-memory queue, no rate limits and a settable session. */
export function createTestApi(options: { disableRateLimits?: boolean } = {}): TestApi {
  const queue = new InMemoryJobQueue();
  let actor: AuthActor | null = null;
  let fixedNow: Date | null = null;
  const app = createApiApp({
    deps: { queue, now: () => fixedNow ?? new Date() },
    resolveActor: async () => actor,
    disableRateLimits: options.disableRateLimits ?? true,
    clientIp: TEST_CLIENT_IP,
  });
  const request = async (path: string, init?: RequestInit) => app.request(path, init);
  return {
    app,
    queue,
    setActor(next) {
      actor = next;
    },
    setNow(next) {
      fixedNow = next;
    },
    request,
    json(method, path, body, headers = {}) {
      return request(path, {
        method,
        headers: { "content-type": "application/json", ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    },
  };
}

export { createEventFixture, type EventFixture, uniqueTestSuffix };
