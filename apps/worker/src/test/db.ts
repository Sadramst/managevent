/**
 * Test-only database helpers for the worker.
 *
 * The local database is SHARED between people and test runs. Tests create their own rows with
 * unique ids, emails and slugs, and delete only those rows. Never truncate, reset or bulk-delete.
 */
import { randomBytes } from "node:crypto";
import { db, generateId } from "@managevent/db";
import { SAFE_TOKEN_ALPHABET } from "@managevent/validators";
import type { ResendEmailAdapter, ResendEmailPayload } from "../lib/resend.js";

const PROBE_TIMEOUT_MS = 1_500;

async function probeDatabase(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
    });
    const query = db.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    return await Promise.race([query, timeout]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** True when `SELECT 1` answers within 1.5 seconds: `describe.skipIf(!dbAvailable)`. */
export const dbAvailable: boolean = await probeDatabase();

/** A short unique fragment for emails, slugs and queue names in tests. */
export function uniqueTestSuffix(): string {
  return randomBytes(8).toString("hex");
}

export interface SentEmail extends ResendEmailPayload {
  idempotencyKey: string | undefined;
}

/**
 * A stand-in for the Resend adapter that records what would have been sent. `failFor` makes
 * delivery to those addresses throw, the way a provider rejection does.
 */
export function createRecordingAdapter(options: { failFor?: readonly string[] } = {}): {
  adapter: ResendEmailAdapter;
  sent: SentEmail[];
  attempts: SentEmail[];
} {
  const sent: SentEmail[] = [];
  const attempts: SentEmail[] = [];
  return {
    sent,
    attempts,
    adapter: {
      async sendEmail(payload, idempotencyKey) {
        attempts.push({ ...payload, idempotencyKey });
        if (options.failFor?.includes(payload.to)) throw new Error("rejected");
        sent.push({ ...payload, idempotencyKey });
        return { id: `re_test_${sent.length}_${uniqueTestSuffix()}` };
      },
    },
  };
}

export interface CampaignFixture {
  userId: string;
  eventId: string;
  invitationId: string;
  eventSlug: string;
  /** Adds a party with one guest per entry; returns ids in the same order. */
  addParty(input: {
    displayName: string;
    guests: Array<{ name: string; email?: string }>;
    revoked?: boolean;
  }): Promise<{ partyId: string; token: string; guestIds: string[] }>;
  /** Creates a QUEUED email campaign for these recipients. */
  addCampaign(
    kind: "INVITE" | "REMINDER",
    recipients: Array<{ partyId: string; guestId: string }>,
  ): Promise<string>;
  /** Remembers an address hash so its `Unsubscribe` row is removed on cleanup. */
  trackUnsubscribe(addressHash: string): void;
  /** Deletes exactly the rows this fixture created. */
  cleanup(): Promise<void>;
}

/** A host, a published event and its invitation, created directly in the database. */
export async function createCampaignFixture(
  overrides: {
    experienceMode?: "CELEBRATION" | "MEMORIAL";
    published?: boolean;
    rsvpDeadline?: Date | null;
    hosts?: string | null;
  } = {},
): Promise<CampaignFixture> {
  const userId = generateId("usr_");
  const eventId = generateId("evt_");
  const invitationId = generateId("inv_");
  const eventSlug = `worker-test-${uniqueTestSuffix()}`;
  const memorial = overrides.experienceMode === "MEMORIAL";
  const unsubscribeHashes: string[] = [];

  await db.user.create({
    data: {
      id: userId,
      email: `worker-${uniqueTestSuffix()}@test.managevent.invalid`,
      name: "Worker Test Host",
      roles: ["CUSTOMER_HOST"],
    },
  });
  await db.event.create({
    data: {
      id: eventId,
      ownerUserId: userId,
      title: { en: memorial ? "In memory of Grace Hopper" : "Ada & Charles" },
      ceremonySlug: memorial ? "memorial-service" : "wedding",
      experienceMode: memorial ? "MEMORIAL" : "CELEBRATION",
      status: "LIVE",
      // 16:00 on 20 December 2026 in Perth.
      startsAt: new Date("2026-12-20T08:00:00.000Z"),
      timeZone: "Australia/Perth",
    },
  });
  await db.invitation.create({
    data: {
      id: invitationId,
      eventId,
      eventSlug,
      templateSlug: memorial ? "memorial-calm" : "royal-classic",
      themeId: memorial ? "memorial-alabaster" : "royal-ivory",
      gateStyle: memorial ? "plain-fade" : "wax-seal",
      contentJson: {
        version: 1,
        headline: "Test",
        ...(overrides.hosts === null ? {} : { hosts: overrides.hosts ?? "The Lovelace family" }),
      },
      languages: ["en"],
      defaultLanguage: "en",
      plan: "PREMIUM",
      rsvpDeadline: overrides.rsvpDeadline ?? null,
      rsvpConfigJson: {},
      publishedAt: overrides.published === false ? null : new Date(),
      salt: randomBytes(32).toString("hex"),
      wellConfigJson: {},
    },
  });

  return {
    userId,
    eventId,
    invitationId,
    eventSlug,
    async addParty(input) {
      const partyId = generateId("pty_");
      const slug = input.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const suffix = Array.from(randomBytes(8), (byte) =>
        SAFE_TOKEN_ALPHABET.charAt(byte % SAFE_TOKEN_ALPHABET.length),
      ).join("");
      const token = `${slug}-${suffix}`;
      await db.party.create({
        data: {
          id: partyId,
          invitationId,
          stableId: `s_${randomBytes(12).toString("hex")}`,
          displayName: { en: input.displayName },
          token,
          tokenRevokedAt: input.revoked ? new Date() : null,
          maxSeats: Math.max(1, input.guests.length),
          tags: [],
        },
      });
      const guestIds: string[] = [];
      for (const guest of input.guests) {
        const id = generateId("gst_");
        await db.guest.create({
          data: {
            id,
            partyId,
            stableId: `s_${randomBytes(12).toString("hex")}`,
            name: { en: guest.name },
            email: guest.email ?? null,
          },
        });
        guestIds.push(id);
      }
      return { partyId, token, guestIds };
    },
    async addCampaign(kind, recipients) {
      const id = generateId("cmp_");
      await db.campaign.create({
        data: {
          id,
          invitationId,
          channel: "EMAIL",
          audienceFilterJson: { kind, recipients, skipped: [] },
          status: "QUEUED",
          consentAttestationUserId: userId,
        },
      });
      return id;
    },
    trackUnsubscribe(addressHash) {
      unsubscribeHashes.push(addressHash);
    },
    async cleanup() {
      if (unsubscribeHashes.length > 0) {
        await db.unsubscribe.deleteMany({
          where: { channel: "EMAIL", address: { in: unsubscribeHashes } },
        });
      }
      // `Message` has no foreign key to the event.
      await db.message.deleteMany({ where: { eventId } });
      await db.event.deleteMany({ where: { id: eventId } });
      await db.user.deleteMany({ where: { id: userId } });
    },
  };
}
