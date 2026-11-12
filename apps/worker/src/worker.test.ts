import PgBoss from "pg-boss";
import { describe, expect, it } from "vitest";
import { db, generateId } from "@managevent/db";
import { z } from "zod";
import {
  createDefaultWorkerRegistry,
  scheduleRegisteredJobs,
  WORKER_SCHEDULES,
  WorkerJobRegistry,
} from "./index.js";
import { dbAvailable, uniqueTestSuffix } from "./test/db.js";

describe("@managevent/worker registry", () => {
  it("registers every job with a schema, a dedupe key, a retry policy and a dead-letter queue", () => {
    const registry = createDefaultWorkerRegistry();
    expect(registry.listJobNames()).toEqual([
      "lead.created",
      "headcount.changed",
      "invitation.email_campaign",
    ]);
    expect(WORKER_SCHEDULES.length).toBeGreaterThanOrEqual(2);

    // With a queue to put campaigns back on, the sweep is registered too, and it is scheduled.
    const withQueue = createDefaultWorkerRegistry({ enqueueCampaign: async () => undefined });
    expect(withQueue.listJobNames()).toContain("invitation.email_campaign_sweep");
    expect(
      WORKER_SCHEDULES.filter((schedule) => withQueue.getDefinition(schedule.name)).map(
        (schedule) => [schedule.name, schedule.cron],
      ),
    ).toEqual([["invitation.email_campaign_sweep", "*/5 * * * *"]]);

    for (const name of registry.listJobNames()) {
      const definition = registry.getDefinition(name);
      expect(definition?.retryPolicy.retryLimit).toBeGreaterThan(0);
      expect(definition?.retryPolicy.retryBackoff).toBe(true);
      expect(definition?.retryPolicy.deadLetterQueue).toBe(`dlq.${name}`);
    }
    expect(
      registry.getDefinition("invitation.email_campaign")?.dedupeKey({
        campaignId: "cmp_018f2f6e-7c1a-7b3c-9d2e-1a2b3c4d5e6f",
      }),
    ).toBe("campaign:cmp_018f2f6e-7c1a-7b3c-9d2e-1a2b3c4d5e6f");
  });

  it("validates payloads, deduplicates by dedupe key and rejects unknown or duplicate jobs", async () => {
    const registry = new WorkerJobRegistry();
    const handled: string[] = [];
    const definition = {
      name: "test.echo",
      schema: z.object({ id: z.string().min(1) }),
      dedupeKey: (payload: { id: string }) => `test.echo:${payload.id}`,
      retryPolicy: {
        retryLimit: 1,
        retryDelaySec: 1,
        retryBackoff: true,
        deadLetterQueue: "dlq.test.echo",
      },
      handler: async (payload: { id: string }) => {
        handled.push(payload.id);
        return payload.id;
      },
    };
    registry.register(definition);
    expect(() => registry.register(definition)).toThrow("Duplicate job registration");

    const first = await registry.executeJob<string>("test.echo", { id: "a" });
    expect(first).toEqual({ deduplicated: false, dedupeKey: "test.echo:a", result: "a" });
    const second = await registry.executeJob("test.echo", { id: "a" });
    expect(second).toEqual({ deduplicated: true, dedupeKey: "test.echo:a" });
    expect(handled).toEqual(["a"]);

    await expect(registry.executeJob("test.echo", { id: "" })).rejects.toThrow();
    await expect(registry.executeJob("test.unknown", {})).rejects.toThrow("Unknown worker job");
  });
});

describe.skipIf(!dbAvailable)("@managevent/worker (database)", () => {
  it("binds jobs to pg-boss with their retry policy and dead-letter queue, and runs a queued job", async () => {
    const suffix = uniqueTestSuffix();
    const queueName = `test.worker.${suffix}`;
    const deadLetterQueue = `dlq.test.worker.${suffix}`;
    const handled: string[] = [];
    let resolveHandled: (() => void) | undefined;
    const done = new Promise<void>((resolve) => {
      resolveHandled = resolve;
    });

    const registry = new WorkerJobRegistry();
    registry.register({
      name: queueName,
      schema: z.object({ id: z.string() }),
      dedupeKey: (payload) => `${queueName}:${payload.id}`,
      retryPolicy: {
        retryLimit: 2,
        retryDelaySec: 7,
        retryBackoff: true,
        deadLetterQueue,
        expireInSeconds: 120,
      },
      handler: async (payload) => {
        handled.push(payload.id);
        resolveHandled?.();
      },
    });

    const boss = new PgBoss({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/managevent",
      schedule: false,
      supervise: false,
      max: 2,
    });
    boss.on("error", () => {});
    await boss.start();
    try {
      // The API creates queues without a policy before the worker starts; the worker must still
      // end up with its retry policy and dead-letter queue applied.
      await boss.createQueue(queueName);
      await registry.bindToPgBoss(boss);

      const queue = await boss.getQueue(queueName);
      expect(queue).toMatchObject({
        retryLimit: 2,
        retryDelay: 7,
        retryBackoff: true,
        expireInSeconds: 120,
        deadLetter: deadLetterQueue,
      });
      expect(await boss.getQueue(deadLetterQueue)).not.toBeNull();

      // A schedule is started only for a job that is registered, with the job's own time zone.
      const started = await scheduleRegisteredJobs(boss, registry, [
        { name: queueName, cron: "*/5 * * * *", timeZone: "Australia/Perth", description: "t" },
        {
          name: `${queueName}.absent`,
          cron: "0 2 * * *",
          timeZone: "Australia/Perth",
          description: "t",
        },
      ]);
      expect(started).toEqual([queueName]);
      const schedules = (await boss.getSchedules()).filter((entry) =>
        entry.name.startsWith(queueName),
      );
      expect(schedules).toHaveLength(1);
      expect(schedules[0]).toMatchObject({
        name: queueName,
        cron: "*/5 * * * *",
        timezone: "Australia/Perth",
        data: {},
      });
      await boss.unschedule(queueName);

      await boss.send(queueName, { id: "job-1" });
      await Promise.race([
        done,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("the queued job was not processed")), 15_000);
        }),
      ]);
      expect(handled).toEqual(["job-1"]);
    } finally {
      await boss.offWork(queueName).catch(() => {});
      // Remove only what this test created: its job rows first (a queue with jobs cannot be
      // deleted), then the queue, then the dead-letter queue the queue points at.
      await db.$executeRaw`DELETE FROM pgboss.job WHERE name IN (${queueName}, ${deadLetterQueue})`;
      await boss.deleteQueue(queueName);
      await boss.deleteQueue(deadLetterQueue);
      await boss.stop({ graceful: false });
      expect(
        await db.$queryRaw`SELECT name FROM pgboss.queue WHERE name IN (${queueName}, ${deadLetterQueue})`,
      ).toEqual([]);
    }
  }, 30_000);

  it("executes headcount.changed job -> computes recommendations via @managevent/logistics and stores RecommendationSet", async () => {
    const userId = generateId("usr_");
    const eventId = generateId("evt_");
    const orderId = generateId("ord_");
    const orderLineId = generateId("oln_");
    const headcountId = generateId("hc_");

    await db.user.create({
      data: {
        id: userId,
        email: `worker-test-${userId}@example.com`,
        name: "Worker Test Host",
        roles: ["CUSTOMER_HOST"],
      },
    });

    await db.event.create({
      data: {
        id: eventId,
        ownerUserId: userId,
        title: { en: "Bridge Test Wedding" },
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        startsAt: new Date("2026-12-20T08:00:00.000Z"),
      },
    });

    await db.order.create({
      data: {
        id: orderId,
        eventId,
        status: "ACCEPTED",
        priceListVersion: "2026.10.1",
        totalsJson: {},
        termsVersion: "2026.1",
        lines: {
          create: [
            {
              id: orderLineId,
              kind: "SERVICE",
              refId: "catering-sig",
              description: { en: "Signature Catering" },
              qty: 80,
              unit: "GUEST",
              unitPriceExGstCents: 10_000,
              amountExGstCents: 800_000,
              gstCents: 80_000,
              amountIncGstCents: 880_000,
              logisticsKey: "catering.main",
            },
          ],
        },
      },
    });

    await db.eventHeadcount.create({
      data: {
        id: headcountId,
        eventId,
        adultsYes: 90,
        childrenYes: 10,
        maybe: 4,
        pending: 10,
        no: 5,
        dietaryCountsJson: { HALAL: 30, NUT_ALLERGY: 2 },
        trigger: "RSVP",
      },
    });

    const registry = createDefaultWorkerRegistry();
    const execRes = await registry.executeJob<{
      recommendationSetId: string;
      rulesVersion: string;
      itemCount: number;
    }>("headcount.changed", {
      eventId,
      headcountId,
      alcoholServed: true,
    });

    expect(execRes.deduplicated).toBe(false);
    expect(execRes.result?.recommendationSetId).toMatch(/^rec_/);
    expect(execRes.result?.itemCount).toBeGreaterThanOrEqual(8);

    const savedSet = await db.recommendationSet.findUnique({
      where: { id: execRes.result?.recommendationSetId ?? "" },
    });
    expect(savedSet?.status).toBe("OPEN");
    expect(savedSet?.orderId).toBe(orderId);

    // Cleanup
    await db.event.delete({ where: { id: eventId } });
    await db.user.delete({ where: { id: userId } });
  });

  it("keeps the newest snapshot's recommendations OPEN whatever order the jobs run in", async () => {
    const userId = generateId("usr_");
    const eventId = generateId("evt_");
    await db.user.create({
      data: {
        id: userId,
        email: `worker-order-${uniqueTestSuffix()}@test.managevent.invalid`,
        name: "Worker Order Host",
        roles: ["CUSTOMER_HOST"],
      },
    });
    await db.event.create({
      data: {
        id: eventId,
        ownerUserId: userId,
        title: { en: "Order Test Wedding" },
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        startsAt: new Date("2026-12-20T08:00:00.000Z"),
      },
    });

    try {
      const base = Date.now() - 60_000;
      const snapshot = async (adultsYes: number, pending: number, ageRank: number) => {
        const id = generateId("hc_");
        await db.eventHeadcount.create({
          data: {
            id,
            eventId,
            takenAt: new Date(base + ageRank * 1000),
            adultsYes,
            childrenYes: 0,
            maybe: 0,
            pending,
            no: 0,
            dietaryCountsJson: {},
            trigger: "RSVP",
          },
        });
        return id;
      };
      // Three RSVPs within seconds: 1, then 2, then 3 adults coming.
      const first = await snapshot(1, 2, 0);
      const second = await snapshot(2, 1, 1);
      const third = await snapshot(3, 0, 2);

      const run = (headcountId: string) =>
        // A fresh registry each time: only the database decides, as across worker processes.
        createDefaultWorkerRegistry().executeJob("headcount.changed", { eventId, headcountId });
      const statuses = async () => {
        const sets = await db.recommendationSet.findMany({ where: { eventId } });
        return Object.fromEntries(sets.map((set) => [set.basedOnHeadcountId, set.status]));
      };

      // The job for the newest snapshot runs first; the older ones arrive late (a retry, a
      // slower worker, an enqueue that happened after a later commit).
      await run(third);
      expect(await statuses()).toEqual({ [third]: "OPEN" });
      await run(first);
      await run(second);
      expect(await statuses()).toEqual({
        [first]: "SUPERSEDED",
        [second]: "SUPERSEDED",
        [third]: "OPEN",
      });

      // Running any of them again changes nothing.
      await run(first);
      await run(third);
      expect(await db.recommendationSet.count({ where: { eventId } })).toBe(3);
      expect(await db.recommendationSet.count({ where: { eventId, status: "OPEN" } })).toBe(1);

      // A newer snapshot still takes over, and two workers on it at once produce one set.
      const fourth = await snapshot(4, 0, 3);
      await Promise.all([run(fourth), run(fourth), run(second)]);
      expect(await statuses()).toEqual({
        [first]: "SUPERSEDED",
        [second]: "SUPERSEDED",
        [third]: "SUPERSEDED",
        [fourth]: "OPEN",
      });
    } finally {
      await db.event.delete({ where: { id: eventId } });
      await db.user.delete({ where: { id: userId } });
    }
  });
});
