import { describe, expect, it } from "vitest";
import { db, generateId } from "@managevent/db";
import {
  createDefaultWorkerRegistry,
  type ResendEmailAdapter,
  type ResendEmailPayload,
  WORKER_SCHEDULES,
} from "./index.js";

describe("@managevent/worker", () => {
  it("registers Phase 0 jobs, validates payloads with Zod, and deduplicates by dedupeKey", async () => {
    const sentEmails: ResendEmailPayload[] = [];
    const mockResend: ResendEmailAdapter = {
      async sendEmail(payload) {
        sentEmails.push(payload);
        return { id: `mock_${sentEmails.length}` };
      },
    };

    const registry = createDefaultWorkerRegistry({ emailAdapter: mockResend });
    expect(registry.listJobNames()).toEqual(["lead.created", "headcount.changed"]);
    expect(WORKER_SCHEDULES.length).toBeGreaterThanOrEqual(2);

    const leadId = generateId("lead_");
    const jobPayload = {
      leadId,
      name: "Sara Ahmadi",
      email: "sara@example.com",
      preferredLanguage: "fa" as const,
      source: "BUILDER" as const,
      ceremonySlug: "sofreh-aghd",
    };

    // First execution sends auto-reply (in FA) + planner alert (in EN) and writes Message row
    const firstRun = await registry.executeJob("lead.created", jobPayload);
    expect(firstRun.deduplicated).toBe(false);
    expect(sentEmails).toHaveLength(2);
    expect(sentEmails[0]?.subject).toContain("منج‌ایونت");
    expect(sentEmails[1]?.to).toBe("planners@managevent.com.au");

    // Second execution with same leadId is deduplicated by registry
    const secondRun = await registry.executeJob("lead.created", jobPayload);
    expect(secondRun.deduplicated).toBe(true);
    expect(sentEmails).toHaveLength(2);

    // Even a fresh registry instance checks DB idempotency on `providerId: lead-auto-reply:<leadId>`
    const freshRegistry = createDefaultWorkerRegistry({ emailAdapter: mockResend });
    const thirdRun = await freshRegistry.executeJob<{ alreadySent: boolean }>(
      "lead.created",
      jobPayload,
    );
    expect(thirdRun.result?.alreadySent).toBe(true);
    expect(sentEmails).toHaveLength(2);

    // Cleanup test Message row
    await db.message.deleteMany({
      where: { providerId: `lead-auto-reply:${leadId}` },
    });
  });

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
});
