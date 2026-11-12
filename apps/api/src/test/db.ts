/**
 * Test-only database helpers.
 *
 * `dbAvailable` lets DB-backed suites skip cleanly on a machine without Postgres:
 * `describe.skipIf(!dbAvailable)("...", () => { ... })`.
 *
 * The local database is SHARED between people and test runs. Tests must create their own rows with
 * unique ids, emails and slugs, and delete only those rows. Never truncate, reset or bulk-delete.
 */
import { db, generateId } from "@managevent/db";
import type { ClientIpConfig } from "../lib/client-ip.js";
import { generateEventSalt, generateEventSlug } from "../lib/guest-tokens.js";

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

/** True when `SELECT 1` answers within 1.5 seconds. */
export const dbAvailable: boolean = await probeDatabase();

/**
 * How the shared test apps learn the client address: as if they stood behind an edge proxy that
 * sets `x-forwarded-for` itself, so a test names its client there. The real default trusts no
 * header at all; that, and the shared-secret path, are covered in `lib/infra.test.ts`,
 * `lib/client-ip.test.ts` and `lib/auth-guard.db.test.ts`.
 */
export const TEST_CLIENT_IP: ClientIpConfig = {
  proxySecret: null,
  trustedHeader: "x-forwarded-for",
};

/**
 * Removes the RSVP submission ledger rows of these parties. They live in `WebhookEvent`, which
 * has no foreign key to the party, so deleting an event does not take them with it.
 */
export async function deleteRsvpSubmissions(partyIds: readonly string[]): Promise<void> {
  if (partyIds.length === 0) return;
  await db.webhookEvent.deleteMany({
    where: {
      provider: "guest-rsvp",
      OR: partyIds.map((partyId) => ({ providerEventId: { startsWith: `${partyId}:` } })),
    },
  });
}

/** The ledger rows of every party of these invitations. */
export async function deleteRsvpSubmissionsOfInvitations(
  invitationIds: readonly string[],
): Promise<void> {
  if (invitationIds.length === 0) return;
  const parties = await db.party.findMany({
    where: { invitationId: { in: [...invitationIds] } },
    select: { id: true },
  });
  await deleteRsvpSubmissions(parties.map((party) => party.id));
}

/** A short unique fragment for emails, slugs and idempotency keys in tests. */
export function uniqueTestSuffix(): string {
  return generateId("usr_").slice(4).replaceAll("-", "").slice(0, 20);
}

export interface EventFixture {
  userId: string;
  eventId: string;
  invitationId: string;
  eventSlug: string;
  salt: string;
  /** Deletes exactly the rows this fixture (and anything hanging off its event) created. */
  cleanup: () => Promise<void>;
}

/**
 * Creates a host user, an event, its invitation and the OWNER co-host row directly in the
 * database, all with fresh unique ids. Use it as the starting point of a DB-backed module test.
 */
export async function createEventFixture(
  overrides: {
    experienceMode?: "CELEBRATION" | "MEMORIAL";
    plan?: "FREE" | "PREMIUM" | "AGENCY";
    published?: boolean;
    isDemo?: boolean;
    startsAt?: Date;
    timeZone?: string;
    rsvpDeadline?: Date | null;
    wellMode?: "NONE" | "WISHING_WELL" | "TRIBUTE_BOOK";
  } = {},
): Promise<EventFixture> {
  const userId = generateId("usr_");
  const eventId = generateId("evt_");
  const invitationId = generateId("inv_");
  const salt = generateEventSalt();
  const memorial = overrides.experienceMode === "MEMORIAL";
  const eventSlug = generateEventSlug(`test ${uniqueTestSuffix()}`);
  const startsAt = overrides.startsAt ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const published = overrides.published ?? true;

  await db.user.create({
    data: {
      id: userId,
      email: `host-${uniqueTestSuffix()}@test.managevent.invalid`,
      name: "Test Host",
      roles: ["CUSTOMER_HOST"],
    },
  });
  await db.event.create({
    data: {
      id: eventId,
      ownerUserId: userId,
      title: { en: "Test Event" },
      ceremonySlug: memorial ? "memorial-service" : "wedding",
      experienceMode: memorial ? "MEMORIAL" : "CELEBRATION",
      status: published ? "LIVE" : "DRAFT",
      startsAt,
      timeZone: overrides.timeZone ?? "Australia/Perth",
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
        headline: "Test Event",
        subheadline: "",
        hosts: "The Test family",
        wording: "",
        story: [],
        schedule: [],
        venue: { name: "Test Hall", address: "1 Test Street, Perth WA" },
        faq: [],
        coverImageUrl: null,
        galleryImageUrls: [],
        music: { enabled: false, url: null, title: null, rightsAttested: false },
      },
      languages: ["en"],
      defaultLanguage: "en",
      plan: overrides.plan ?? "FREE",
      rsvpDeadline: overrides.rsvpDeadline ?? null,
      rsvpConfigJson: {
        allowMaybe: false,
        askDietary: true,
        askAccessibility: true,
        songPrompt: memorial ? "HIDDEN" : "STANDARD",
        askMessage: true,
        askContact: false,
      },
      publishedAt: published ? new Date() : null,
      salt,
      wellMode: overrides.wellMode ?? "NONE",
      wellConfigJson: {},
      isDemo: overrides.isDemo ?? false,
    },
  });
  await db.coHost.create({
    data: { id: generateId("coh_"), eventId, userId, role: "OWNER" },
  });

  return {
    userId,
    eventId,
    invitationId,
    eventSlug,
    salt,
    cleanup: async () => {
      // Rows without a cascading foreign key to the event go first.
      await deleteRsvpSubmissionsOfInvitations([invitationId]);
      await db.message.deleteMany({ where: { eventId } });
      await db.payment.deleteMany({ where: { invitationId } });
      await db.auditLog.deleteMany({
        where: { OR: [{ actorUserId: userId }, { entityId: { in: [eventId, invitationId] } }] },
      });
      await db.event.deleteMany({ where: { id: eventId } });
      await db.user.deleteMany({ where: { id: userId } });
    },
  };
}
