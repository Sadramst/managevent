/**
 * `invitation.email_campaign` against the real database, with a recording stand-in for the Resend
 * adapter. Every row is created here with unique ids and removed in `afterAll`.
 */
import { db, generateId } from "@managevent/db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashEmailAddress, verifyUnsubscribeToken } from "../lib/unsubscribe-token.js";
import { WorkerJobRegistry } from "../registry.js";
import {
  type CampaignFixture,
  createCampaignFixture,
  createRecordingAdapter,
  dbAvailable,
  uniqueTestSuffix,
} from "../test/db.js";
import {
  createEmailCampaignJob,
  type EmailCampaignJobResult,
  EmailCampaignJobSchema,
} from "./email-campaign.js";

const address = (label: string): string => `${label}-${uniqueTestSuffix()}@test.managevent.invalid`;

/** 12:00 in Perth: inside sending hours. */
const MIDDAY_PERTH = new Date("2026-11-10T04:00:00.000Z");
/** 21:30 in Perth: quiet hours. */
const EVENING_PERTH = new Date("2026-11-10T13:30:00.000Z");

describe("EmailCampaignJobSchema", () => {
  it("accepts a campaign id and nothing else", () => {
    const campaignId = generateId("cmp_");
    expect(EmailCampaignJobSchema.parse({ campaignId })).toEqual({ campaignId });
    expect(EmailCampaignJobSchema.safeParse({ campaignId: "cmp_nope" }).success).toBe(false);
    expect(EmailCampaignJobSchema.safeParse({}).success).toBe(false);
  });
});

describe.skipIf(!dbAvailable)("invitation.email_campaign job (database)", () => {
  const fixtures: CampaignFixture[] = [];

  async function fixture(overrides: Parameters<typeof createCampaignFixture>[0] = {}) {
    const created = await createCampaignFixture(overrides);
    fixtures.push(created);
    return created;
  }

  function run(
    campaignId: string,
    options: Parameters<typeof createEmailCampaignJob>[0] = {},
  ): Promise<EmailCampaignJobResult> {
    // A fresh registry each time, so only the database (not process memory) prevents a resend.
    const registry = new WorkerJobRegistry();
    registry.register(
      createEmailCampaignJob({ sendIntervalMs: 0, now: () => MIDDAY_PERTH, ...options }),
    );
    return registry
      .executeJob<EmailCampaignJobResult>("invitation.email_campaign", { campaignId })
      .then((outcome) => outcome.result as EmailCampaignJobResult);
  }

  const messagesOf = (campaignId: string) =>
    db.message.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
  const statusOf = async (campaignId: string) =>
    (await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })).status;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_INVITATION_URL", "https://invitation.example.test/");
    vi.stubEnv("EMAIL_FROM_INVITATIONS", "Managevent Invitations <invite@example.test>");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  afterAll(async () => {
    for (const created of fixtures) await created.cleanup();
  });

  it("sends each recipient their own link, records the sends by address hash and finishes SENT", async () => {
    const event = await fixture();
    const adaEmail = address("ada");
    const graceEmail = address("grace");
    const lovelace = await event.addParty({
      displayName: "Lovelace Family",
      guests: [{ name: "Ada", email: adaEmail }],
    });
    const hopper = await event.addParty({
      displayName: "Hopper",
      guests: [{ name: "Grace", email: graceEmail }],
    });
    const campaignId = await event.addCampaign("INVITE", [
      { partyId: lovelace.partyId, guestId: lovelace.guestIds[0] as string },
      { partyId: hopper.partyId, guestId: hopper.guestIds[0] as string },
    ]);
    const { adapter, sent } = createRecordingAdapter();

    const result = await run(campaignId, { emailAdapter: adapter });
    expect(result).toEqual({ status: "SENT", sent: 2, failed: 0, skipped: 0 });
    expect(await statusOf(campaignId)).toBe("SENT");

    expect(sent).toHaveLength(2);
    const [toAda, toGrace] = sent;
    expect(toAda).toMatchObject({
      from: "Managevent Invitations <invite@example.test>",
      to: adaEmail,
      subject: "You are invited to Ada & Charles",
      idempotencyKey: `cmp:${campaignId}:${lovelace.guestIds[0]}`,
    });
    expect(toAda?.text).toContain("Hello Lovelace Family,");
    expect(toAda?.text).toContain(
      "The Lovelace family would love you to join them for Ada & Charles",
    );
    expect(toAda?.text).toContain("Sunday 20 December 2026 at 4:00 pm");
    expect(toAda?.text).toContain(
      `https://invitation.example.test/i/${event.eventSlug}/${lovelace.token}`,
    );
    // Each party gets its own link, never another party's.
    expect(toAda?.text).not.toContain(hopper.token);
    expect(toGrace?.text).toContain(
      `https://invitation.example.test/i/${event.eventSlug}/${hopper.token}`,
    );
    expect(toGrace?.idempotencyKey).toBe(`cmp:${campaignId}:${hopper.guestIds[0]}`);

    // The footer carries an unsubscribe link the API can verify for exactly this address.
    const unsubscribe = /https:\/\/invitation\.example\.test\/unsubscribe\?t=(\S+)/.exec(
      toAda?.text ?? "",
    );
    expect(unsubscribe).not.toBeNull();
    expect(verifyUnsubscribeToken(unsubscribe?.[1] ?? "")).toBe(hashEmailAddress(adaEmail));

    const messages = await messagesOf(campaignId);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      channel: "EMAIL",
      to: hashEmailAddress(adaEmail),
      templateKey: "invitation.send",
      locale: "en",
      eventId: event.eventId,
      status: "SENT",
    });
    expect(messages[0]?.providerId).toMatch(/^re_test_/);
    expect(messages[0]?.sentAt).not.toBeNull();
    // No address, link or token is stored.
    const stored = JSON.stringify(messages);
    expect(stored).not.toContain("@");
    expect(stored).not.toContain(lovelace.token);
  });

  it("does not send twice when the job runs again", async () => {
    const event = await fixture();
    const party = await event.addParty({
      displayName: "Once",
      guests: [{ name: "Once", email: address("once") }],
    });
    const campaignId = await event.addCampaign("INVITE", [
      { partyId: party.partyId, guestId: party.guestIds[0] as string },
    ]);
    const { adapter, sent } = createRecordingAdapter();

    await run(campaignId, { emailAdapter: adapter });
    const again = await run(campaignId, { emailAdapter: adapter });
    expect(again).toMatchObject({ status: "ALREADY_PROCESSED", sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);

    // Even if the campaign were left in SENDING (a crash before the final update), the recorded
    // send stops a second email.
    await db.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });
    const resumed = await run(campaignId, { emailAdapter: adapter });
    expect(resumed).toEqual({ status: "SENT", sent: 1, failed: 0, skipped: 0 });
    expect(sent).toHaveLength(1);
    expect(await messagesOf(campaignId)).toHaveLength(1);
  });

  it("re-checks every recipient at send time", async () => {
    const event = await fixture();
    const goneEmail = address("gone");
    const reachable = await event.addParty({
      displayName: "Reachable",
      guests: [{ name: "Reachable", email: address("reachable") }],
    });
    const unsubscribed = await event.addParty({
      displayName: "Unsubscribed",
      guests: [{ name: "Gone", email: goneEmail }],
    });
    const revoked = await event.addParty({
      displayName: "Revoked",
      guests: [{ name: "Revoked", email: address("revoked") }],
      revoked: true,
    });
    const deleted = await event.addParty({
      displayName: "Deleted",
      guests: [{ name: "Deleted", email: address("deleted") }],
    });
    const noAddress = await event.addParty({
      displayName: "No Address",
      guests: [{ name: "None" }],
    });
    const campaignId = await event.addCampaign(
      "INVITE",
      [reachable, unsubscribed, revoked, deleted, noAddress].map((party) => ({
        partyId: party.partyId,
        guestId: party.guestIds[0] as string,
      })),
    );
    // What changed between the host pressing send and the worker picking the job up.
    event.trackUnsubscribe(hashEmailAddress(goneEmail));
    await db.unsubscribe.create({
      data: { id: generateId("uns_"), channel: "EMAIL", address: hashEmailAddress(goneEmail) },
    });
    await db.guest.update({
      where: { id: deleted.guestIds[0] as string },
      data: { deletedAt: new Date() },
    });

    const { adapter, sent } = createRecordingAdapter();
    const result = await run(campaignId, { emailAdapter: adapter });
    expect(result).toEqual({ status: "SENT", sent: 1, failed: 0, skipped: 4 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain(reachable.token);
    expect(await messagesOf(campaignId)).toHaveLength(1);
  });

  it("records a failed delivery, finishes PARTIAL and retries only the failure", async () => {
    const event = await fixture();
    const badEmail = address("bounces");
    const good = await event.addParty({
      displayName: "Good",
      guests: [{ name: "Good", email: address("good") }],
    });
    const bad = await event.addParty({
      displayName: "Bad",
      guests: [{ name: "Bad", email: badEmail }],
    });
    const campaignId = await event.addCampaign("INVITE", [
      { partyId: good.partyId, guestId: good.guestIds[0] as string },
      { partyId: bad.partyId, guestId: bad.guestIds[0] as string },
    ]);

    const flaky = createRecordingAdapter({ failFor: [badEmail] });
    const first = await run(campaignId, { emailAdapter: flaky.adapter });
    expect(first).toEqual({ status: "PARTIAL", sent: 1, failed: 1, skipped: 0 });
    expect(await statusOf(campaignId)).toBe("PARTIAL");
    const failedRow = (await messagesOf(campaignId)).find((message) => message.status === "FAILED");
    expect(failedRow).toMatchObject({
      to: hashEmailAddress(badEmail),
      providerId: `failed:${campaignId}:${bad.guestIds[0]}`,
      sentAt: null,
    });

    // Re-driven (status back to SENDING): the delivered one is not repeated, the failed one is.
    await db.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });
    const working = createRecordingAdapter();
    const second = await run(campaignId, { emailAdapter: working.adapter });
    expect(second).toEqual({ status: "SENT", sent: 2, failed: 0, skipped: 0 });
    expect(working.sent.map((email) => email.to)).toEqual([badEmail]);
    const after = await messagesOf(campaignId);
    expect(after).toHaveLength(2);
    expect(after.every((message) => message.status === "SENT")).toBe(true);

    // All recipients failing is FAILED.
    const allBad = await event.addCampaign("INVITE", [
      { partyId: bad.partyId, guestId: bad.guestIds[0] as string },
    ]);
    // A different campaign may email the same address again; only delivery fails here.
    const failing = createRecordingAdapter({ failFor: [badEmail] });
    expect(await run(allBad, { emailAdapter: failing.adapter })).toEqual({
      status: "FAILED",
      sent: 0,
      failed: 1,
      skipped: 0,
    });
  });

  it("marks the campaign FAILED and sends nothing when email is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const event = await fixture();
    const party = await event.addParty({
      displayName: "Waiting",
      guests: [{ name: "Waiting", email: address("waiting") }],
    });
    const campaignId = await event.addCampaign("INVITE", [
      { partyId: party.partyId, guestId: party.guestIds[0] as string },
    ]);

    const result = await run(campaignId);
    expect(result).toEqual({ status: "NOT_CONFIGURED", sent: 0, failed: 0, skipped: 0 });
    expect(await statusOf(campaignId)).toBe("FAILED");
    // Nothing is recorded as sent, so the host can send it again once email is set up.
    expect(await messagesOf(campaignId)).toHaveLength(0);
  });

  it("sends reminders with the reply-by date, but never in quiet hours", async () => {
    const event = await fixture({ rsvpDeadline: new Date("2026-12-01T15:59:00.000Z") });
    const party = await event.addParty({
      displayName: "Pending",
      guests: [{ name: "Pending", email: address("pending") }],
    });
    const recipients = [{ partyId: party.partyId, guestId: party.guestIds[0] as string }];

    const quietCampaign = await event.addCampaign("REMINDER", recipients);
    const quiet = createRecordingAdapter();
    const refused = await run(quietCampaign, {
      emailAdapter: quiet.adapter,
      now: () => EVENING_PERTH,
    });
    expect(refused.status).toBe("QUIET_HOURS");
    expect(quiet.attempts).toHaveLength(0);
    expect(await statusOf(quietCampaign)).toBe("FAILED");
    expect(await messagesOf(quietCampaign)).toHaveLength(0);

    const dayCampaign = await event.addCampaign("REMINDER", recipients);
    const { adapter, sent } = createRecordingAdapter();
    const result = await run(dayCampaign, { emailAdapter: adapter });
    expect(result).toEqual({ status: "SENT", sent: 1, failed: 0, skipped: 0 });
    expect(sent[0]?.subject).toBe("A reminder to reply: Ada & Charles");
    expect(sent[0]?.text).toContain("friendly reminder");
    expect(sent[0]?.text).toContain("Please reply by Tuesday 1 December 2026 at 11:59 pm.");
    expect(sent[0]?.text).toContain(`/i/${event.eventSlug}/${party.token}`);
    expect(sent[0]?.text).toContain("/unsubscribe?t=");
    expect((await messagesOf(dayCampaign))[0]?.templateKey).toBe("rsvp.reminder");
  });

  it("uses calm wording for a memorial event", async () => {
    const event = await fixture({ experienceMode: "MEMORIAL", hosts: null });
    const party = await event.addParty({
      displayName: "The Babbage family",
      guests: [{ name: "Charles", email: address("charles") }],
    });
    const recipients = [{ partyId: party.partyId, guestId: party.guestIds[0] as string }];

    const invite = createRecordingAdapter();
    await run(await event.addCampaign("INVITE", recipients), { emailAdapter: invite.adapter });
    expect(invite.sent[0]?.subject).toBe("An invitation to In memory of Grace Hopper");
    expect(invite.sent[0]?.text).toContain(
      "You are invited by Your hosts to In memory of Grace Hopper",
    );

    const reminder = createRecordingAdapter();
    await run(await event.addCampaign("REMINDER", recipients), { emailAdapter: reminder.adapter });
    expect(reminder.sent[0]?.subject).toBe("A gentle reminder: In memory of Grace Hopper");

    for (const email of [...invite.sent, ...reminder.sent]) {
      expect(email.text).not.toMatch(/would love|friendly|celebrat|party!/i);
    }
  });

  it("does not send for an unpublished invitation or an unknown campaign", async () => {
    const draft = await fixture({ published: false });
    const party = await draft.addParty({
      displayName: "Draft",
      guests: [{ name: "Draft", email: address("draft") }],
    });
    const campaignId = await draft.addCampaign("INVITE", [
      { partyId: party.partyId, guestId: party.guestIds[0] as string },
    ]);
    const { adapter, attempts } = createRecordingAdapter();

    expect((await run(campaignId, { emailAdapter: adapter })).status).toBe("NOT_SENDABLE");
    expect(await statusOf(campaignId)).toBe("FAILED");
    expect((await run(generateId("cmp_"), { emailAdapter: adapter })).status).toBe("NOT_FOUND");
    expect(attempts).toHaveLength(0);
  });

  it("never leaves a campaign SENDING when a run dies: it goes back to QUEUED and a retry finishes it", async () => {
    const event = await fixture();
    const party = await event.addParty({
      displayName: "Interrupted",
      guests: [
        { name: "One", email: address("one") },
        { name: "Two", email: address("two") },
      ],
    });
    const campaignId = await event.addCampaign(
      "INVITE",
      party.guestIds.map((guestId) => ({ partyId: party.partyId, guestId })),
    );

    // The first run breaks after the provider accepted the first email (the clock stands in for
    // any failure between two database writes).
    const { adapter, sent } = createRecordingAdapter();
    let clockCalls = 0;
    const failing = run(campaignId, {
      emailAdapter: adapter,
      now: () => {
        clockCalls += 1;
        if (clockCalls >= 1) throw new Error("connection lost");
        return MIDDAY_PERTH;
      },
    });
    await expect(failing).rejects.toThrow("connection lost");
    // Not SENDING: that would count its recipients as emailed for ever.
    expect(await statusOf(campaignId)).toBe("QUEUED");
    expect(sent).toHaveLength(1);

    // pg-boss retries the job (or the sweep re-queues it): the campaign completes.
    const retry = await run(campaignId, { emailAdapter: adapter });
    expect(retry).toMatchObject({ status: "SENT", sent: 2, failed: 0 });
    expect(await statusOf(campaignId)).toBe("SENT");
    expect(await messagesOf(campaignId)).toHaveLength(2);
  });

  it("paces sends so the provider's rate limit is not hit", async () => {
    const event = await fixture();
    const party = await event.addParty({
      displayName: "Three",
      guests: [
        { name: "One", email: address("one") },
        { name: "Two", email: address("two") },
        { name: "Three", email: address("three") },
      ],
    });
    const campaignId = await event.addCampaign(
      "INVITE",
      party.guestIds.map((guestId) => ({ partyId: party.partyId, guestId })),
    );
    const waits: number[] = [];
    const { adapter } = createRecordingAdapter();
    await run(campaignId, {
      emailAdapter: adapter,
      sendIntervalMs: 600,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    // Between sends only: not before the first, not after the last.
    expect(waits).toEqual([600, 600]);
  });
});
