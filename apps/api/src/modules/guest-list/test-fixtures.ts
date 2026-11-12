/**
 * Test-only fixtures for the guest-list, responses, messaging and CRM suites.
 *
 * The local database is shared between people and test runs. Every row here is created with a
 * fresh unique id, email or slug, and `HostWorld.cleanup()` removes exactly the rows it created
 * (plus rows the API wrote for them). Nothing is truncated or bulk-deleted.
 */
import type { AuthActor } from "@managevent/auth";
import { type CoHostRole, db, encryptRsvpWriteData, generateId, type Role } from "@managevent/db";
import { createApiApp } from "../../app.js";
import { buildPartyToken, generateStableId } from "../../lib/guest-tokens.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
import {
  createEventFixture,
  type EventFixture,
  TEST_CLIENT_IP,
  uniqueTestSuffix,
} from "../../test/db.js";

export { uniqueTestSuffix };

export type EventOverrides = NonNullable<Parameters<typeof createEventFixture>[0]>;

export interface PartySeed {
  partyId: string;
  token: string;
  guestIds: string[];
}

export interface TestApi {
  app: ReturnType<typeof createApiApp>;
  queue: InMemoryJobQueue;
  /** Moves the API clock; null returns to the real time. */
  setNow(now: Date | null): void;
  /** Sends a request as `actor` (null = signed out). JSON bodies are serialised for you. */
  call(
    actor: AuthActor | null,
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
}

/** The real app on the real database with an in-memory queue and a per-request session. */
export function createTestApi(options: { rateLimits?: boolean } = {}): TestApi {
  const queue = new InMemoryJobQueue();
  let actor: AuthActor | null = null;
  let fixedNow: Date | null = null;
  const app = createApiApp({
    deps: { queue, now: () => fixedNow ?? new Date() },
    resolveActor: async () => actor,
    disableRateLimits: options.rateLimits !== true,
    clientIp: TEST_CLIENT_IP,
  });
  return {
    app,
    queue,
    setNow(next) {
      fixedNow = next;
    },
    async call(as, method, path, body, headers = {}) {
      actor = as;
      return app.request(path, {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    },
  };
}

/**
 * A set of test rows that is removed together: events (each with its own owner), extra users,
 * unsubscribes and leads.
 */
export class HostWorld {
  private readonly events: EventFixture[] = [];
  private readonly userIds: string[] = [];
  private readonly unsubscribeHashes: string[] = [];
  private readonly leadIds: string[] = [];

  /** Creates an owner, an event, its invitation and the OWNER co-host row. */
  async createEvent(overrides: EventOverrides = {}): Promise<EventFixture & { owner: AuthActor }> {
    const fixture = await createEventFixture(overrides);
    this.events.push(fixture);
    return { ...fixture, owner: { userId: fixture.userId, roles: ["CUSTOMER_HOST"] } };
  }

  /** Creates a user and returns the actor a session for them resolves to. */
  async createUser(roles: Role[] = ["CUSTOMER_HOST"]): Promise<AuthActor & { userId: string }> {
    const userId = generateId("usr_");
    await db.user.create({
      data: {
        id: userId,
        email: `e3-${uniqueTestSuffix()}@test.managevent.invalid`,
        name: "Test Person",
        roles,
        // Staff sessions only resolve with two-factor enabled; mirror that in the row.
        twoFactorEnabled: roles.some((role) => role === "PLANNER_STAFF" || role === "SUPER_ADMIN"),
      },
    });
    this.userIds.push(userId);
    return { userId, roles, mfaVerified: true };
  }

  async addCoHost(
    fixture: EventFixture,
    role: CoHostRole,
  ): Promise<AuthActor & { userId: string }> {
    const actor = await this.createUser(["CUSTOMER_HOST"]);
    await db.coHost.create({
      data: { id: generateId("coh_"), eventId: fixture.eventId, userId: actor.userId, role },
    });
    return actor;
  }

  /** Creates a party with its guests directly in the database, with a real derived token. */
  async seedParty(
    fixture: EventFixture,
    input: {
      displayName: string;
      guests: Array<{ name: string; isChild?: boolean; email?: string }>;
      tableLabel?: string;
      tags?: string[];
    },
  ): Promise<PartySeed> {
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
        maxSeats: Math.max(1, input.guests.length),
        childrenAllowed: true,
        tags: input.tags ?? [],
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
        },
      });
      guestIds.push(id);
    }
    return { partyId, token, guestIds };
  }

  /**
   * Stores a guest's answer the way the guest site does: a top-level `rsvp` write, which the
   * field-encryption extension encrypts.
   */
  async seedRsvp(
    guestId: string,
    answer: {
      status: "YES" | "NO" | "MAYBE";
      dietary?: string[];
      allergySeverity?: "MILD" | "MODERATE" | "SEVERE_ANAPHYLAXIS";
      allergyNotes?: string;
      accessibilityNotes?: string;
      songRequests?: string[];
      messageToHost?: string;
      respondedAt?: Date;
    },
  ): Promise<void> {
    await db.rsvp.create({
      // `dietary` and `allergySeverity` become the encrypted columns; the notes are encrypted
      // in place.
      data: encryptRsvpWriteData({
        id: generateId("rsvp_"),
        guestId,
        status: answer.status,
        respondedAt: answer.respondedAt ?? new Date(),
        songRequests: answer.songRequests ?? [],
        messageToHost: answer.messageToHost ?? null,
        source: "WEB" as const,
        idempotencyKey: `test-${uniqueTestSuffix()}:${guestId}`,
        ...(answer.dietary ? { dietary: answer.dietary } : {}),
        ...(answer.allergySeverity ? { allergySeverity: answer.allergySeverity } : {}),
        ...(answer.allergyNotes ? { allergyNotes: answer.allergyNotes } : {}),
        ...(answer.accessibilityNotes ? { accessibilityNotes: answer.accessibilityNotes } : {}),
      }),
    });
  }

  /** Remembers an address hash so an `Unsubscribe` row made for it is removed on cleanup. */
  trackUnsubscribe(addressHash: string): void {
    this.unsubscribeHashes.push(addressHash);
  }

  /** Remembers a lead (and its consent record) created through the API. */
  trackLead(leadId: string): void {
    this.leadIds.push(leadId);
  }

  async cleanup(): Promise<void> {
    if (this.leadIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entity: "Lead", entityId: { in: this.leadIds } } });
      await db.consentRecord.deleteMany({
        where: { subjectType: "LEAD", subjectId: { in: this.leadIds } },
      });
      await db.message.deleteMany({
        where: {
          providerId: {
            in: this.leadIds.flatMap((id) => [`lead-auto-reply:${id}`, `lead-planner-alert:${id}`]),
          },
        },
      });
      await db.lead.deleteMany({ where: { id: { in: this.leadIds } } });
    }
    if (this.unsubscribeHashes.length > 0) {
      await db.unsubscribe.deleteMany({
        where: { channel: "EMAIL", address: { in: this.unsubscribeHashes } },
      });
    }
    for (const fixture of this.events) {
      // Audit rows about this event's parties, guests and campaigns have no foreign key to it.
      const [parties, guests, campaigns] = await Promise.all([
        db.party.findMany({
          where: { invitationId: fixture.invitationId },
          select: { id: true },
        }),
        db.guest.findMany({
          where: { party: { invitationId: fixture.invitationId } },
          select: { id: true },
        }),
        db.campaign.findMany({
          where: { invitationId: fixture.invitationId },
          select: { id: true },
        }),
      ]);
      const entityIds = [...parties, ...guests, ...campaigns].map((row) => row.id);
      if (entityIds.length > 0) {
        await db.auditLog.deleteMany({ where: { entityId: { in: entityIds } } });
      }
      await fixture.cleanup();
    }
    if (this.userIds.length > 0) {
      await db.auditLog.deleteMany({ where: { actorUserId: { in: this.userIds } } });
      await db.user.deleteMany({ where: { id: { in: this.userIds } } });
    }
  }
}
