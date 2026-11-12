/**
 * Messaging against the real database. The API never sends email itself: it records a campaign
 * and enqueues the worker job, so these tests need no network. `RESEND_API_KEY` is stubbed per
 * test to cover both "configured" and "not configured". Rows are created with unique ids and
 * removed in `afterAll`.
 */
import { db, generateId } from "@managevent/db";
import {
  EmailCampaignResultSchema,
  HostPartyListSchema,
  MessagingStatusSchema,
} from "@managevent/validators";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { createApiApp } from "../../app.js";
import type { JobName, JobQueue } from "../../lib/queue.js";
import { dbAvailable } from "../../test/db.js";
import { createTestApi, HostWorld, uniqueTestSuffix } from "../guest-list/test-fixtures.js";
import { CampaignAudienceSchema } from "./repo.js";
import { createUnsubscribeToken, hashEmailAddress } from "./unsubscribe-token.js";

type ErrorBody = { error: { code: string; details?: Record<string, unknown> } };
type TestEvent = Awaited<ReturnType<HostWorld["createEvent"]>>;

const errorBody = async (res: Response): Promise<ErrorBody["error"]> =>
  ((await res.json()) as ErrorBody).error;

/** A unique address per call, so nothing collides with other runs in the shared database. */
const address = (label: string): string => `${label}-${uniqueTestSuffix()}@test.managevent.invalid`;
const key = (): string => `msg-${uniqueTestSuffix()}`;

/** 12:00 in Perth: inside sending hours. */
const MIDDAY_PERTH = new Date("2026-11-10T04:00:00.000Z");
/** 21:30 in Perth: quiet hours. */
const EVENING_PERTH = new Date("2026-11-10T13:30:00.000Z");

describe.skipIf(!dbAvailable)("messaging (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key_not_used_for_network_calls");
    api.setNow(MIDDAY_PERTH);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    api.setNow(null);
  });
  afterAll(async () => {
    await world.cleanup();
  });

  const invitationsPath = (event: TestEvent) =>
    `/v1/events/${event.eventId}/messaging/email-invitations`;
  const remindersPath = (event: TestEvent) =>
    `/v1/events/${event.eventId}/messaging/rsvp-reminders`;
  const all = { partyIds: "ALL", consentAttested: true };

  async function recordSent(
    event: TestEvent,
    email: string,
    templateKey: "invitation.send" | "rsvp.reminder",
    campaignId?: string,
  ): Promise<void> {
    await db.message.create({
      data: {
        id: generateId("msg_"),
        channel: "EMAIL",
        to: hashEmailAddress(email),
        templateKey,
        locale: "en",
        eventId: event.eventId,
        campaignId: campaignId ?? null,
        status: "SENT",
        providerId: `test-${uniqueTestSuffix()}`,
        sentAt: new Date(),
      },
    });
  }

  describe("email invitations", () => {
    it("answers 503 EMAIL_NOT_CONFIGURED and queues nothing when no provider is set", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const event = await world.createEvent();
      await world.seedParty(event, {
        displayName: "Lovelace",
        guests: [{ name: "Ada", email: address("ada") }],
      });
      const jobsBefore = api.queue.jobs.length;

      const res = await api.call(event.owner, "POST", invitationsPath(event), all, {
        "idempotency-key": key(),
      });
      expect(res.status).toBe(503);
      expect((await errorBody(res)).code).toBe("EMAIL_NOT_CONFIGURED");
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(0);
      expect(api.queue.jobs.length).toBe(jobsBefore);

      const status = MessagingStatusSchema.parse(
        await (await api.call(event.owner, "GET", `/v1/events/${event.eventId}/messaging`)).json(),
      );
      expect(status.emailConfigured).toBe(false);
      expect(status.campaigns).toEqual([]);
    });

    it("records a campaign, enqueues the worker job once and replays the same result", async () => {
      const event = await world.createEvent();
      const adaEmail = address("ada");
      const lovelace = await world.seedParty(event, {
        displayName: "Lovelace",
        guests: [
          { name: "Ada", email: adaEmail },
          { name: "Byron", email: adaEmail.toUpperCase() },
          { name: "Child", isChild: true },
        ],
      });
      const noEmail = await world.seedParty(event, {
        displayName: "No Email",
        guests: [{ name: "Nobody" }],
      });
      const revoked = await world.seedParty(event, {
        displayName: "Revoked",
        guests: [{ name: "Revoked", email: address("revoked") }],
      });
      await db.party.update({
        where: { id: revoked.partyId },
        data: { tokenRevokedAt: new Date() },
      });
      const goneEmail = address("gone");
      const unsubscribed = await world.seedParty(event, {
        displayName: "Unsubscribed",
        guests: [{ name: "Gone", email: goneEmail }],
      });
      world.trackUnsubscribe(hashEmailAddress(goneEmail));
      await db.unsubscribe.create({
        data: { id: generateId("uns_"), channel: "EMAIL", address: hashEmailAddress(goneEmail) },
      });

      const idempotencyKey = key();
      const jobsBefore = api.queue.jobs.length;
      const res = await api.call(event.owner, "POST", invitationsPath(event), all, {
        "idempotency-key": idempotencyKey,
        "x-forwarded-for": "203.0.113.7",
      });
      expect(res.status).toBe(202);
      const result = EmailCampaignResultSchema.parse(await res.json());
      expect(result.queued).toBe(1);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { partyId: noEmail.partyId, reason: "NO_EMAIL" },
          { partyId: revoked.partyId, reason: "LINK_REVOKED" },
          { partyId: unsubscribed.partyId, reason: "UNSUBSCRIBED" },
        ]),
      );
      expect(result.skipped).toHaveLength(3);

      const campaign = await db.campaign.findUniqueOrThrow({ where: { id: result.campaignId } });
      expect(campaign).toMatchObject({
        invitationId: event.invitationId,
        channel: "EMAIL",
        status: "QUEUED",
        consentAttestationUserId: event.userId,
      });
      const audience = CampaignAudienceSchema.parse(campaign.audienceFilterJson);
      expect(audience.kind).toBe("INVITE");
      // One email for the address Ada and Byron share; ids only, no addresses.
      expect(audience.recipients).toEqual([
        { partyId: lovelace.partyId, guestId: lovelace.guestIds[0] },
      ]);
      expect(JSON.stringify(campaign.audienceFilterJson)).not.toContain("@");

      expect(api.queue.jobs.slice(jobsBefore)).toEqual([
        {
          name: "invitation.email_campaign",
          payload: { campaignId: result.campaignId },
          // `required`: a campaign is only reported as queued once the job is in the queue.
          opts: { singletonKey: `campaign:${result.campaignId}`, required: true },
        },
      ]);

      const audit = await db.auditLog.findMany({
        where: { action: "campaign.create", entityId: result.campaignId },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorUserId: event.userId, ip: "203.0.113.7" });
      expect(audit[0]?.diffJson).toMatchObject({ kind: "INVITE", queued: 1, skipped: 3 });
      expect(JSON.stringify(audit[0]?.diffJson)).not.toContain("@");

      // Same key: same campaign, no second row, no second job.
      const replay = await api.call(event.owner, "POST", invitationsPath(event), all, {
        "idempotency-key": idempotencyKey,
      });
      expect(replay.status).toBe(202);
      expect(EmailCampaignResultSchema.parse(await replay.json())).toEqual(result);
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(1);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      // A new request while the first is still queued does not email the same address again.
      const second = EmailCampaignResultSchema.parse(
        await (
          await api.call(event.owner, "POST", invitationsPath(event), all, {
            "idempotency-key": key(),
          })
        ).json(),
      );
      expect(second.queued).toBe(0);
      expect(second.skipped).toContainEqual({ partyId: lovelace.partyId, reason: "ALREADY_SENT" });
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);
      expect(
        (await db.campaign.findUniqueOrThrow({ where: { id: second.campaignId } })).status,
      ).toBe("SENT");
    });

    it("does not report a campaign as queued when its job could not be enqueued, and recovers on a retry", async () => {
      // A queue that behaves like `PgBossJobQueue` while pg-boss is unreachable: it throws for a
      // `required` enqueue and answers null otherwise.
      let down = true;
      const jobs: Array<{ name: JobName; payload: Record<string, unknown> }> = [];
      const queue: JobQueue = {
        async enqueue(name, payload, opts = {}) {
          if (down) {
            if (opts.required) throw new Error("connect ECONNREFUSED");
            return null;
          }
          jobs.push({ name, payload });
          return `job_${jobs.length}`;
        },
      };
      let actor: AuthActor | null = null;
      const app = createApiApp({
        deps: { queue, now: () => MIDDAY_PERTH },
        resolveActor: async () => actor,
        disableRateLimits: true,
      });
      const send = (event: TestEvent, idempotencyKey: string) => {
        actor = event.owner;
        return app.request(invitationsPath(event), {
          method: "POST",
          headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
          body: JSON.stringify(all),
        });
      };

      const event = await world.createEvent();
      const party = await world.seedParty(event, {
        displayName: "Stranded",
        guests: [{ name: "Stella", email: address("stella") }],
      });
      const first = key();

      // The campaign commits, but the queue is down: the host is NOT told it is on its way.
      const failed = await send(event, first);
      expect(failed.status).toBe(503);
      const problem = await errorBody(failed);
      expect(problem.code).toBe("QUEUE_UNAVAILABLE");
      const stranded = await db.campaign.findMany({ where: { invitationId: event.invitationId } });
      expect(stranded).toHaveLength(1);
      expect(stranded[0]).toMatchObject({ status: "QUEUED", id: problem.details?.campaignId });
      expect(jobs).toEqual([]);

      // Still down: the same request keeps failing, and makes no second campaign.
      expect((await send(event, first)).status).toBe(503);
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(1);

      // The queue comes back. Repeating the request enqueues the campaign that was left behind.
      down = false;
      const retried = await send(event, first);
      expect(retried.status).toBe(202);
      const result = EmailCampaignResultSchema.parse(await retried.json());
      expect(result).toMatchObject({ campaignId: stranded[0]?.id, queued: 1, skipped: [] });
      expect(jobs).toEqual([
        { name: "invitation.email_campaign", payload: { campaignId: result.campaignId } },
      ]);
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(1);
      expect(party.guestIds).toHaveLength(1);
    });

    it("skips addresses that already have the invitation and shows send history on the party", async () => {
      const event = await world.createEvent();
      const sentEmail = address("sent");
      const sent = await world.seedParty(event, {
        displayName: "Already Invited",
        guests: [{ name: "Sent", email: sentEmail }],
      });
      const fresh = await world.seedParty(event, {
        displayName: "Fresh",
        guests: [{ name: "Fresh", email: address("fresh") }],
      });
      await recordSent(event, sentEmail, "invitation.send");
      await recordSent(event, sentEmail, "rsvp.reminder");

      const result = EmailCampaignResultSchema.parse(
        await (
          await api.call(
            event.owner,
            "POST",
            invitationsPath(event),
            { partyIds: [sent.partyId, fresh.partyId], consentAttested: true },
            { "idempotency-key": key() },
          )
        ).json(),
      );
      expect(result.queued).toBe(1);
      expect(result.skipped).toEqual([{ partyId: sent.partyId, reason: "ALREADY_SENT" }]);

      const list = HostPartyListSchema.parse(
        await (await api.call(event.owner, "GET", `/v1/events/${event.eventId}/parties`)).json(),
      );
      const invited = list.items.find((party) => party.id === sent.partyId);
      expect(invited?.email.hasAddress).toBe(true);
      expect(invited?.email.inviteSentAt).not.toBeNull();
      expect(invited?.email.remindersSent).toBe(1);
      expect(list.items.find((party) => party.id === fresh.partyId)?.email).toEqual({
        hasAddress: true,
        inviteSentAt: null,
        remindersSent: 0,
      });
    });

    it("requires a published invitation, an attestation, an Idempotency-Key and known parties", async () => {
      const draft = await world.createEvent({ published: false });
      await world.seedParty(draft, {
        displayName: "Draft",
        guests: [{ name: "Draft", email: address("draft") }],
      });
      const unpublished = await api.call(draft.owner, "POST", invitationsPath(draft), all, {
        "idempotency-key": key(),
      });
      expect(unpublished.status).toBe(409);
      expect((await errorBody(unpublished)).code).toBe("NOT_PUBLISHED");

      const event = await world.createEvent();
      const other = await world.createEvent();
      const foreign = await world.seedParty(other, {
        displayName: "Foreign",
        guests: [{ name: "Foreign", email: address("foreign") }],
      });

      const noKey = await api.call(event.owner, "POST", invitationsPath(event), all);
      expect(noKey.status).toBe(400);
      const notAttested = await api.call(
        event.owner,
        "POST",
        invitationsPath(event),
        { partyIds: "ALL", consentAttested: false },
        { "idempotency-key": key() },
      );
      expect(notAttested.status).toBe(400);

      // Another event's party cannot be emailed through this event.
      const crossed = await api.call(
        event.owner,
        "POST",
        invitationsPath(event),
        { partyIds: [foreign.partyId], consentAttested: true },
        { "idempotency-key": key() },
      );
      expect(crossed.status).toBe(404);
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(0);
    });

    it("enforces the FREE plan's 50 email limit, counting sent and queued emails", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      for (let index = 0; index < 49; index += 1) {
        await recordSent(event, address(`history-${index}`), "invitation.send");
      }
      const first = await world.seedParty(event, {
        displayName: "Fiftieth",
        guests: [{ name: "Fiftieth", email: address("fiftieth") }],
      });
      const second = await world.seedParty(event, {
        displayName: "Fifty-first",
        guests: [{ name: "Fifty-first", email: address("fifty-first") }],
      });

      const tooMany = await api.call(event.owner, "POST", invitationsPath(event), all, {
        "idempotency-key": key(),
      });
      expect(tooMany.status).toBe(403);
      const problem = await errorBody(tooMany);
      expect(problem.code).toBe("PLAN_LIMIT_EXCEEDED");
      expect(problem.details).toEqual({ limit: 50, used: 49, requested: 2 });
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(0);

      const one = await api.call(
        event.owner,
        "POST",
        invitationsPath(event),
        { partyIds: [first.partyId], consentAttested: true },
        { "idempotency-key": key() },
      );
      expect(one.status).toBe(202);

      // The queued email already counts, so the next one is over the limit.
      const overQueued = await api.call(
        event.owner,
        "POST",
        invitationsPath(event),
        { partyIds: [second.partyId], consentAttested: true },
        { "idempotency-key": key() },
      );
      expect(overQueued.status).toBe(403);

      const status = MessagingStatusSchema.parse(
        await (await api.call(event.owner, "GET", `/v1/events/${event.eventId}/messaging`)).json(),
      );
      expect(status.quota).toEqual({ limit: 50, used: 50 });
      expect(status.remindersEntitled).toBe(false);
      expect(status.emailConfigured).toBe(true);
    });

    it("is closed to other hosts, VIEWER co-hosts, signed-out callers and sample invitations", async () => {
      const event = await world.createEvent();
      const other = await world.createEvent();
      const viewer = await world.addCoHost(event, "VIEWER");
      const demo = await world.createEvent({ isDemo: true, plan: "PREMIUM" });
      const headers = () => ({ "idempotency-key": key() });

      for (const path of [invitationsPath(event), remindersPath(event)]) {
        expect((await api.call(null, "POST", path, all, headers())).status).toBe(401);
        expect((await api.call(other.owner, "POST", path, all, headers())).status).toBe(404);
        expect((await api.call(viewer, "POST", path, all, headers())).status).toBe(403);
      }
      const statusPath = `/v1/events/${event.eventId}/messaging`;
      expect((await api.call(null, "GET", statusPath)).status).toBe(401);
      expect((await api.call(other.owner, "GET", statusPath)).status).toBe(404);
      expect((await api.call(viewer, "GET", statusPath)).status).toBe(200);

      const sample = await api.call(demo.owner, "POST", invitationsPath(demo), all, headers());
      expect(sample.status).toBe(403);
      expect((await errorBody(sample)).code).toBe("DEMO_READ_ONLY");
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(0);
    });
  });

  describe("RSVP reminders", () => {
    it("needs the rsvpReminders entitlement", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      const res = await api.call(event.owner, "POST", remindersPath(event), all, {
        "idempotency-key": key(),
      });
      expect(res.status).toBe(403);
      const problem = await errorBody(res);
      expect(problem.code).toBe("FEATURE_NOT_IN_PLAN");
      expect(problem.details).toEqual({ feature: "rsvpReminders" });
    });

    it("answers 503 when email is not configured and 409 when the invitation is a draft", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      vi.stubEnv("RESEND_API_KEY", "");
      const notConfigured = await api.call(event.owner, "POST", remindersPath(event), all, {
        "idempotency-key": key(),
      });
      expect(notConfigured.status).toBe(503);
      expect((await errorBody(notConfigured)).code).toBe("EMAIL_NOT_CONFIGURED");
      vi.stubEnv("RESEND_API_KEY", "re_test_key_not_used_for_network_calls");

      const draft = await world.createEvent({ plan: "PREMIUM", published: false });
      const unpublished = await api.call(draft.owner, "POST", remindersPath(draft), all, {
        "idempotency-key": key(),
      });
      expect(unpublished.status).toBe(409);
      expect((await errorBody(unpublished)).code).toBe("NOT_PUBLISHED");
    });

    it("refuses to send in quiet hours and once RSVPs have closed", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      await world.seedParty(event, {
        displayName: "Pending",
        guests: [{ name: "Pending", email: address("pending") }],
      });

      api.setNow(EVENING_PERTH);
      const quiet = await api.call(event.owner, "POST", remindersPath(event), all, {
        "idempotency-key": key(),
      });
      expect(quiet.status).toBe(409);
      expect((await errorBody(quiet)).code).toBe("QUIET_HOURS");
      expect(await db.campaign.count({ where: { invitationId: event.invitationId } })).toBe(0);

      const closed = await world.createEvent({
        plan: "PREMIUM",
        rsvpDeadline: new Date(MIDDAY_PERTH.getTime() - 60_000),
      });
      api.setNow(MIDDAY_PERTH);
      const late = await api.call(closed.owner, "POST", remindersPath(closed), all, {
        "idempotency-key": key(),
      });
      expect(late.status).toBe(409);
      expect((await errorBody(late)).code).toBe("RSVP_CLOSED");
    });

    it("reminds pending parties only, at most twice per address", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      const pending = await world.seedParty(event, {
        displayName: "Pending",
        guests: [{ name: "Pending", email: address("pending") }],
      });
      const answered = await world.seedParty(event, {
        displayName: "Answered",
        guests: [{ name: "Answered", email: address("answered") }],
      });
      await world.seedRsvp(answered.guestIds[0] as string, { status: "YES" });
      const remindedEmail = address("reminded");
      const reminded = await world.seedParty(event, {
        displayName: "Reminded Twice",
        guests: [{ name: "Reminded", email: remindedEmail }],
      });
      await recordSent(event, remindedEmail, "rsvp.reminder");
      await recordSent(event, remindedEmail, "rsvp.reminder");

      const jobsBefore = api.queue.jobs.length;
      const res = await api.call(event.owner, "POST", remindersPath(event), all, {
        "idempotency-key": key(),
      });
      expect(res.status).toBe(202);
      const result = EmailCampaignResultSchema.parse(await res.json());
      expect(result.queued).toBe(1);
      // "ALL" is every pending party, so the answered party is not part of the audience at all.
      expect(result.skipped).toEqual([{ partyId: reminded.partyId, reason: "REMINDER_LIMIT" }]);

      const campaign = await db.campaign.findUniqueOrThrow({ where: { id: result.campaignId } });
      const audience = CampaignAudienceSchema.parse(campaign.audienceFilterJson);
      expect(audience.kind).toBe("REMINDER");
      expect(audience.recipients).toEqual([
        { partyId: pending.partyId, guestId: pending.guestIds[0] },
      ]);
      expect(api.queue.jobs.slice(jobsBefore).map((job) => job.name)).toEqual([
        "invitation.email_campaign",
      ]);

      // Asked for by id, an answered party is reported as not pending.
      const explicit = EmailCampaignResultSchema.parse(
        await (
          await api.call(
            event.owner,
            "POST",
            remindersPath(event),
            { partyIds: [answered.partyId], consentAttested: true },
            { "idempotency-key": key() },
          )
        ).json(),
      );
      expect(explicit).toMatchObject({
        queued: 0,
        skipped: [{ partyId: answered.partyId, reason: "NOT_PENDING" }],
      });
    });
  });

  describe("status", () => {
    it("reports campaigns with their send results, newest first", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      const emails = [address("one"), address("two"), address("three")];
      const party = await world.seedParty(event, {
        displayName: "Trio",
        guests: emails.map((email, index) => ({ name: `Guest ${index}`, email })),
      });

      const result = EmailCampaignResultSchema.parse(
        await (
          await api.call(event.owner, "POST", invitationsPath(event), all, {
            "idempotency-key": key(),
          })
        ).json(),
      );
      expect(result.queued).toBe(3);

      const read = async () =>
        MessagingStatusSchema.parse(
          await (
            await api.call(event.owner, "GET", `/v1/events/${event.eventId}/messaging`)
          ).json(),
        );

      const queued = await read();
      expect(queued.remindersEntitled).toBe(true);
      expect(queued.quota).toEqual({ limit: null, used: 3 });
      expect(queued.campaigns).toEqual([
        expect.objectContaining({
          id: result.campaignId,
          kind: "INVITE",
          status: "QUEUED",
          counts: { total: 3, sent: 0, failed: 0, skipped: 0 },
        }),
      ]);

      // What the worker leaves behind: one sent, one failed, one passed over; campaign PARTIAL.
      await recordSent(event, emails[0] as string, "invitation.send", result.campaignId);
      await db.message.create({
        data: {
          id: generateId("msg_"),
          channel: "EMAIL",
          to: hashEmailAddress(emails[1] as string),
          templateKey: "invitation.send",
          locale: "en",
          eventId: event.eventId,
          campaignId: result.campaignId,
          status: "FAILED",
          providerId: `failed:${result.campaignId}:${party.guestIds[1]}`,
        },
      });
      await db.campaign.update({ where: { id: result.campaignId }, data: { status: "PARTIAL" } });

      const finished = await read();
      expect(finished.quota).toEqual({ limit: null, used: 1 });
      expect(finished.campaigns[0]).toMatchObject({
        status: "PARTIAL",
        counts: { total: 3, sent: 1, failed: 1, skipped: 1 },
      });
    });
  });

  describe("public unsubscribe", () => {
    it("records the address hash once, needs no session, and stops later campaigns", async () => {
      const event = await world.createEvent();
      const email = address("leaving");
      const hash = hashEmailAddress(email);
      world.trackUnsubscribe(hash);
      const party = await world.seedParty(event, {
        displayName: "Leaving",
        guests: [{ name: "Leaving", email }],
      });
      const token = createUnsubscribeToken(hash);

      const res = await api.call(null, "POST", "/v1/public/unsubscribe", { token });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      // Repeating it is harmless.
      const again = await api.call(null, "POST", "/v1/public/unsubscribe", { token });
      expect(again.status).toBe(200);
      const rows = await db.unsubscribe.findMany({ where: { channel: "EMAIL", address: hash } });
      expect(rows).toHaveLength(1);
      // Only the hash is stored.
      expect(JSON.stringify(rows)).not.toContain(email);

      const result = EmailCampaignResultSchema.parse(
        await (
          await api.call(event.owner, "POST", invitationsPath(event), all, {
            "idempotency-key": key(),
          })
        ).json(),
      );
      expect(result).toMatchObject({
        queued: 0,
        skipped: [{ partyId: party.partyId, reason: "UNSUBSCRIBED" }],
      });
    });

    it("rejects a forged or malformed token without writing anything", async () => {
      const hash = hashEmailAddress(address("victim"));
      const token = createUnsubscribeToken(hash);
      const [hashPart = "", signature = ""] = token.split(".");
      const tampered = `${hashPart}.${signature.slice(0, -4)}AAAA`;

      for (const bad of [tampered, `${"a".repeat(30)}.${"b".repeat(30)}`]) {
        const res = await api.call(null, "POST", "/v1/public/unsubscribe", { token: bad });
        expect(res.status).toBe(400);
        expect((await errorBody(res)).code).toBe("VALIDATION_ERROR");
      }
      expect(
        (await api.call(null, "POST", "/v1/public/unsubscribe", { token: "short" })).status,
      ).toBe(400);
      expect((await api.call(null, "POST", "/v1/public/unsubscribe", {})).status).toBe(400);
      expect(await db.unsubscribe.count({ where: { channel: "EMAIL", address: hash } })).toBe(0);
    });
  });
});
