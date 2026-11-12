/**
 * `client.me`, `client.events` and `client.billing` against the real API app and database, so the
 * client's paths, request schemas and response schemas are proven to match what the API serves.
 *
 * Rows are created with fresh ids and removed afterwards; nothing else in the database is touched.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp, InMemoryJobQueue } from "@managevent/api";
import { db, generateId } from "@managevent/db";
import { createApiClient, isApiError, ManageventApiClientError } from "../index.js";

async function probeDatabase(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), 1_500);
    });
    const query = db.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    return await Promise.race([query, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const dbAvailable = await probeDatabase();
const STRIPE_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

describe.skipIf(!dbAvailable)("host resources (database)", () => {
  const savedEnv = Object.fromEntries(STRIPE_ENV.map((name) => [name, process.env[name]]));
  const userId = generateId("usr_");
  const email = `client-${userId.slice(-12)}@test.managevent.invalid`;
  let signedIn = true;

  const app = createApiApp({
    deps: { queue: new InMemoryJobQueue() },
    disableRateLimits: true,
    // Test-only actor: the real app resolves it from a Better Auth session.
    resolveActor: async () => (signedIn ? { userId, roles: ["CUSTOMER_HOST"] as const } : null),
  });
  const client = createApiClient({
    baseUrl: "http://localhost:4000",
    fetchImpl: (input, init) => Promise.resolve(app.request(input, init)),
  });

  beforeAll(async () => {
    for (const name of STRIPE_ENV) delete process.env[name];
    await db.user.create({
      data: { id: userId, email, name: "Client Test Host", roles: ["CUSTOMER_HOST"] },
    });
  });

  afterAll(async () => {
    for (const name of STRIPE_ENV) {
      const value = savedEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    const events = await db.event.findMany({
      where: { ownerUserId: userId },
      select: { id: true, invitation: { select: { id: true } } },
    });
    const ids = events.flatMap((event) => [
      event.id,
      ...(event.invitation ? [event.invitation.id] : []),
    ]);
    await db.auditLog.deleteMany({
      where: { OR: [{ actorUserId: userId }, { entityId: { in: ids } }] },
    });
    await db.event.deleteMany({ where: { ownerUserId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  it("reads the signed-in user, and null when signed out", async () => {
    const me = await client.me.get();
    expect(me.user).toMatchObject({ id: userId, email, roles: ["CUSTOMER_HOST"] });
    expect(me.capabilities).toMatchObject({ emailPassword: true, stripeCheckout: false });

    signedIn = false;
    try {
      expect((await client.me.get()).user).toBeNull();
      await expect(client.events.list()).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHENTICATED",
      });
    } finally {
      signedIn = true;
    }
  });

  it("runs an event through create, list, read, edit, publish, plan and delete", async () => {
    // `timeZone` is optional for callers: the request schema supplies the default.
    const created = await client.events.create({
      title: "Client wedding",
      ceremonySlug: "wedding",
      startsAtLocal: "2031-09-20T16:00",
      templateSlug: "royal-classic",
      hosts: "The families",
    });
    expect(created.id).toMatch(/^evt_/);
    expect(created).toMatchObject({ status: "DRAFT", role: "OWNER", timeZone: "Australia/Perth" });

    const list = await client.events.list();
    expect(list.items.map((item) => item.id)).toEqual([created.id]);

    const updated = await client.events.update(created.id, { title: "Client wedding, renamed" });
    expect(updated.title).toBe("Client wedding, renamed");

    // No venue yet: the 422 carries what is missing.
    const notReady = await client.events.publish(created.id).catch((err: unknown) => err);
    expect(isApiError(notReady, "PUBLISH_REQUIREMENTS_NOT_MET")).toBe(true);
    expect(notReady).toMatchObject({ status: 422, details: { missing: ["VENUE"] } });

    // Nested content defaults are optional for callers too.
    const withVenue = await client.events.updateInvitation(created.id, {
      content: {
        version: 1,
        headline: "Client wedding",
        hosts: "The families",
        venue: { name: "Town Hall", address: "1 Main Street, Perth WA" },
        coverImageUrl: null,
        music: { url: null, title: null, rightsAttested: false },
      },
      expectedUpdatedAt: updated.invitation.updatedAt,
    });
    expect(withVenue.checklist.hasVenue).toBe(true);
    expect(withVenue.invitation.content.schedule).toEqual([]);

    const stale = await client.events
      .updateInvitation(created.id, {
        allowForwarding: false,
        expectedUpdatedAt: updated.invitation.updatedAt,
      })
      .catch((err: unknown) => err);
    expect(isApiError(stale, "STALE_WRITE")).toBe(true);

    const gated = await client.events
      .updateInvitation(created.id, { themeId: "midnight-celestial" })
      .catch((err: unknown) => err);
    expect(gated).toBeInstanceOf(ManageventApiClientError);
    expect(gated).toMatchObject({
      status: 403,
      code: "FEATURE_NOT_IN_PLAN",
      details: { feature: "allThemesAndAnimations" },
    });

    const published = await client.events.publish(created.id);
    expect(published.status).toBe("LIVE");
    expect(published.invitation.publishedAt).not.toBeNull();
    const unpublished = await client.events.unpublish(created.id);
    expect(unpublished.status).toBe("DRAFT");

    const plan = await client.billing.getPlan(created.id);
    expect(plan).toMatchObject({
      plan: "FREE",
      upgrade: { available: false, unavailableReason: "PAYMENTS_NOT_CONFIGURED" },
    });

    // No Stripe credentials here: the client surfaces the API's honest 503.
    const checkout = await client.billing
      .createCheckout(created.id, { idempotencyKey: `client-${userId.slice(-12)}` })
      .catch((err: unknown) => err);
    expect(checkout).toMatchObject({ status: 503, code: "PAYMENTS_NOT_CONFIGURED" });
    const confirm = await client.billing
      .confirmCheckout(created.id, { sessionId: "cs_test_not_configured" })
      .catch((err: unknown) => err);
    expect(confirm).toMatchObject({ status: 503, code: "PAYMENTS_NOT_CONFIGURED" });

    const fetched = await client.events.get(created.id);
    expect(fetched.invitation.eventSlug).toBe(created.invitation.eventSlug);

    await expect(client.events.remove(created.id)).resolves.toBeUndefined();
    await expect(client.events.get(created.id)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    expect((await client.events.list()).items).toEqual([]);
  });

  it("validates input before sending anything", async () => {
    let calls = 0;
    const offline = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchImpl: async () => {
        calls += 1;
        return new Response("{}", { status: 200 });
      },
    });
    await expect(
      offline.events.create({
        title: "",
        ceremonySlug: "wedding",
        startsAtLocal: "not-a-date",
        templateSlug: "royal-classic",
        hosts: "The families",
      }),
    ).rejects.toThrow();
    await expect(
      offline.billing.confirmCheckout("evt_x", { sessionId: "short" }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
});
