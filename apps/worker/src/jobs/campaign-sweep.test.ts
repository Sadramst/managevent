/**
 * `invitation.email_campaign_sweep` against the real database. Campaigns are created under this
 * file's own events and removed in `afterAll`. The database is shared, so every sweep here is
 * limited to this file's invitations and never touches anyone else's campaigns.
 */
import { db, generateId } from "@managevent/db";
import { afterAll, describe, expect, it } from "vitest";
import { hashEmailAddress } from "../lib/unsubscribe-token.js";
import {
  type CampaignFixture,
  createCampaignFixture,
  createRecordingAdapter,
  dbAvailable,
  uniqueTestSuffix,
} from "../test/db.js";
import {
  CampaignSweepJobSchema,
  createCampaignSweepJob,
  GIVE_UP_AFTER_MS,
  QUEUED_STALE_AFTER_MS,
  SENDING_STALE_AFTER_MS,
} from "./campaign-sweep.js";
import { createEmailCampaignJob } from "./email-campaign.js";

const MINUTE_MS = 60_000;
/** 12:00 in Perth: inside sending hours. */
const MIDDAY_PERTH = new Date("2026-11-10T04:00:00.000Z");

describe("CampaignSweepJobSchema", () => {
  it("takes an empty payload", () => {
    expect(CampaignSweepJobSchema.parse({})).toEqual({});
    expect(CampaignSweepJobSchema.safeParse({ campaignId: "cmp_1" }).success).toBe(false);
  });

  it("uses a new dedupe key for every schedule tick", () => {
    let at = new Date("2026-11-12T00:00:00.000Z");
    const job = createCampaignSweepJob({ enqueueCampaign: async () => undefined, now: () => at });
    const first = job.dedupeKey({});
    expect(job.dedupeKey({})).toBe(first);
    at = new Date(at.getTime() + 5 * MINUTE_MS);
    expect(job.dedupeKey({})).not.toBe(first);
  });
});

describe.skipIf(!dbAvailable)("invitation.email_campaign_sweep job (database)", () => {
  const fixtures: CampaignFixture[] = [];
  const address = (label: string) => `${label}-${uniqueTestSuffix()}@test.managevent.invalid`;

  afterAll(async () => {
    for (const created of fixtures) await created.cleanup();
  });

  /** A campaign with one recipient, in the given state and of the given age. */
  async function campaign(input: {
    status: "QUEUED" | "SENDING" | "SENT";
    updatedAgoMs: number;
    createdAgoMs?: number;
  }) {
    const event = await createCampaignFixture();
    fixtures.push(event);
    const email = address("sweep");
    const party = await event.addParty({
      displayName: "Sweep",
      guests: [{ name: "Guest", email }],
    });
    const guestId = party.guestIds[0] as string;
    const id = await event.addCampaign("INVITE", [{ partyId: party.partyId, guestId }]);
    const now = Date.now();
    await db.campaign.update({
      where: { id },
      data: {
        status: input.status,
        // Given explicitly, so Prisma does not stamp the row with the current time.
        updatedAt: new Date(now - input.updatedAgoMs),
        createdAt: new Date(now - (input.createdAgoMs ?? input.updatedAgoMs)),
      },
    });
    return { id, event, email };
  }

  const statusOf = async (id: string) =>
    (await db.campaign.findUniqueOrThrow({ where: { id } })).status;

  it("re-queues campaigns whose job was lost and leaves live and finished ones alone", async () => {
    const neverEnqueued = await campaign({
      status: "QUEUED",
      updatedAgoMs: QUEUED_STALE_AFTER_MS + MINUTE_MS,
    });
    const diedMidSend = await campaign({
      status: "SENDING",
      updatedAgoMs: SENDING_STALE_AFTER_MS + MINUTE_MS,
    });
    const justQueued = await campaign({ status: "QUEUED", updatedAgoMs: 10_000 });
    const stillSending = await campaign({ status: "SENDING", updatedAgoMs: 5 * MINUTE_MS });
    const finished = await campaign({
      status: "SENT",
      updatedAgoMs: SENDING_STALE_AFTER_MS + MINUTE_MS,
    });
    const mine = new Set(
      [neverEnqueued, diedMidSend, justQueued, stillSending, finished].map((entry) => entry.id),
    );

    const enqueued: string[] = [];
    const sweep = createCampaignSweepJob({
      invitationIds: fixtures.map((created) => created.invitationId),
      enqueueCampaign: async (campaignId) => {
        if (mine.has(campaignId)) enqueued.push(campaignId);
      },
    });
    const result = await sweep.handler({});
    expect(result).toEqual({ requeued: 2, settled: 0 });
    expect(enqueued.sort()).toEqual([neverEnqueued.id, diedMidSend.id].sort());
    // Re-queueing does not pretend anything was sent.
    expect(await statusOf(neverEnqueued.id)).toBe("QUEUED");
    expect(await statusOf(diedMidSend.id)).toBe("SENDING");
    expect(await statusOf(finished.id)).toBe("SENT");

    // The re-queued job is the ordinary send job, and it finishes the campaign.
    const { adapter, sent } = createRecordingAdapter();
    const send = createEmailCampaignJob({
      emailAdapter: adapter,
      sendIntervalMs: 0,
      now: () => MIDDAY_PERTH,
    });
    for (const campaignId of enqueued) await send.handler({ campaignId });
    expect(await statusOf(neverEnqueued.id)).toBe("SENT");
    expect(await statusOf(diedMidSend.id)).toBe("SENT");
    expect(sent.map((mail) => mail.to).sort()).toEqual(
      [neverEnqueued.email, diedMidSend.email].sort(),
    );
  });

  it("settles a campaign that is still unfinished after a day, so it stops blocking its guests", async () => {
    const neverSent = await campaign({
      status: "QUEUED",
      updatedAgoMs: GIVE_UP_AFTER_MS + MINUTE_MS,
    });
    const partlySent = await campaign({
      status: "SENDING",
      updatedAgoMs: GIVE_UP_AFTER_MS + MINUTE_MS,
    });
    await db.message.create({
      data: {
        id: generateId("msg_"),
        channel: "EMAIL",
        to: hashEmailAddress(partlySent.email),
        templateKey: "invitation.send",
        locale: "en",
        eventId: partlySent.event.eventId,
        campaignId: partlySent.id,
        status: "SENT",
        providerId: `re_test_${uniqueTestSuffix()}`,
        sentAt: new Date(),
      },
    });

    const enqueued: string[] = [];
    const sweep = createCampaignSweepJob({
      invitationIds: [neverSent.event.invitationId, partlySent.event.invitationId],
      enqueueCampaign: async (campaignId) => {
        enqueued.push(campaignId);
      },
    });
    const result = await sweep.handler({});
    expect(result).toEqual({ requeued: 0, settled: 2 });
    expect(enqueued).not.toContain(neverSent.id);
    expect(enqueued).not.toContain(partlySent.id);
    expect(await statusOf(neverSent.id)).toBe("FAILED");
    expect(await statusOf(partlySent.id)).toBe("PARTIAL");

    // Settled campaigns are not picked up again.
    enqueued.length = 0;
    expect(await sweep.handler({})).toEqual({ requeued: 0, settled: 0 });
    expect(enqueued).not.toContain(neverSent.id);
    expect(await statusOf(neverSent.id)).toBe("FAILED");
  });
});
