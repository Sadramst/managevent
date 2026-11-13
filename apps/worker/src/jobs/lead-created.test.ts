/**
 * `lead.created` against the real database, with a recording stand-in for the Resend adapter.
 * Each test creates its own lead and removes it (and its `Message` rows) afterwards.
 */
import { db, generateId } from "@managevent/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashEmailAddress } from "../lib/unsubscribe-token.js";
import { WorkerJobRegistry } from "../registry.js";
import { createRecordingAdapter, dbAvailable, uniqueTestSuffix } from "../test/db.js";
import {
  createLeadCreatedJob,
  type LeadCreatedJobResult,
  LeadCreatedJobSchema,
} from "./lead-created.js";

describe("LeadCreatedJobSchema", () => {
  it("needs only the lead id and drops anything else a producer sends", () => {
    const leadId = generateId("lead_");
    expect(
      LeadCreatedJobSchema.parse({
        leadId,
        name: "Sara",
        email: "sara@example.com",
        source: "BUILDER",
      }),
    ).toEqual({ leadId });
    expect(LeadCreatedJobSchema.safeParse({ leadId: "lead_nope" }).success).toBe(false);
    expect(LeadCreatedJobSchema.safeParse({}).success).toBe(false);
  });
});

describe.skipIf(!dbAvailable)("lead.created job (database)", () => {
  const leadIds: string[] = [];
  const planner = `planner-${uniqueTestSuffix()}@test.managevent.invalid`;

  async function createLead(overrides: Record<string, unknown> = {}) {
    const id = generateId("lead_");
    leadIds.push(id);
    return db.lead.create({
      data: {
        id,
        source: "BUILDER",
        name: "Sara Ahmadi",
        email: `sara-${uniqueTestSuffix()}@test.managevent.invalid`,
        phone: "+61412345678",
        preferredChannel: "WHATSAPP",
        ceremonySlug: "wedding",
        // 14 March 2027 in Perth.
        eventDate: new Date("2027-03-13T16:00:00.000Z"),
        dateFlexible: true,
        guestEstimate: 90,
        area: "Swan Valley",
        message: "We would love a garden ceremony.",
        ...overrides,
      },
    });
  }

  const messagesFor = (leadId: string) =>
    db.message.findMany({
      where: { providerId: { in: [`lead-auto-reply:${leadId}`, `lead-planner-alert:${leadId}`] } },
      orderBy: { providerId: "asc" },
    });

  function run(
    leadId: string,
    options: Parameters<typeof createLeadCreatedJob>[0],
  ): Promise<LeadCreatedJobResult> {
    // A fresh registry each time, so only the database (not process memory) prevents a resend.
    const registry = new WorkerJobRegistry();
    registry.register(createLeadCreatedJob(options));
    return registry
      .executeJob<LeadCreatedJobResult>("lead.created", { leadId })
      .then((outcome) => outcome.result as LeadCreatedJobResult);
  }

  // `SiteSetting` is one shared row; put back whatever a developer had saved.
  let savedSiteSetting: Awaited<ReturnType<typeof db.siteSetting.findUnique>> = null;

  beforeAll(async () => {
    savedSiteSetting = await db.siteSetting.findUnique({ where: { id: "site" } });
  });

  beforeEach(async () => {
    await db.siteSetting.deleteMany({ where: { id: "site" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.siteSetting.deleteMany({ where: { id: "site" } });
    if (savedSiteSetting) await db.siteSetting.create({ data: savedSiteSetting });
    await db.message.deleteMany({
      where: {
        providerId: {
          in: leadIds.flatMap((id) => [`lead-auto-reply:${id}`, `lead-planner-alert:${id}`]),
        },
      },
    });
    await db.lead.deleteMany({ where: { id: { in: leadIds } } });
  });

  it("sends the auto-reply and an enriched planner alert, once", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.example.test/");
    const lead = await createLead();
    const { adapter, sent } = createRecordingAdapter();

    const first = await run(lead.id, { emailAdapter: adapter, plannerInboxEmail: planner });
    expect(first).toEqual({
      status: "SENT",
      alreadySent: false,
      autoReplySent: true,
      plannerAlertSent: true,
    });
    expect(sent).toHaveLength(2);

    const [reply, alert] = sent;
    expect(reply).toMatchObject({ to: lead.email, idempotencyKey: `lead-auto-reply:${lead.id}` });
    expect(reply?.subject).toContain("Managevent");
    expect(reply?.text).toContain("Sara Ahmadi");

    expect(alert).toMatchObject({ to: planner, idempotencyKey: `lead-planner-alert:${lead.id}` });
    expect(alert?.subject).toBe("New Managevent lead: Sara Ahmadi (BUILDER)");
    for (const line of [
      "Name: Sara Ahmadi",
      `Email: ${lead.email}`,
      "Phone: +61412345678",
      "Preferred contact: WHATSAPP",
      "Ceremony: wedding",
      "Event date: 14/03/2027",
      "Date flexible: Yes",
      "Guest estimate: 90",
      "Area: Swan Valley",
      "We would love a garden ceremony.",
      `Open the lead: https://admin.example.test/leads/${lead.id}`,
    ]) {
      expect(alert?.text).toContain(line);
    }

    // Both sends are recorded by address hash, never by address.
    const messages = await messagesFor(lead.id);
    expect(messages.map((message) => [message.providerId, message.status, message.to])).toEqual([
      [`lead-auto-reply:${lead.id}`, "SENT", hashEmailAddress(lead.email)],
      [`lead-planner-alert:${lead.id}`, "SENT", hashEmailAddress(planner)],
    ]);
    expect(JSON.stringify(messages)).not.toContain("@");

    const second = await run(lead.id, { emailAdapter: adapter, plannerInboxEmail: planner });
    expect(second).toMatchObject({ status: "ALREADY_SENT", alreadySent: true });
    expect(sent).toHaveLength(2);
    expect(await messagesFor(lead.id)).toHaveLength(2);
  });

  it("fills in what the enquirer left blank in the planner alert", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAIL", planner);
    const lead = await createLead({
      phone: null,
      ceremonySlug: null,
      eventDate: null,
      dateFlexible: false,
      guestEstimate: null,
      area: null,
      message: null,
    });

    const { adapter, sent } = createRecordingAdapter();
    const result = await run(lead.id, { emailAdapter: adapter });
    expect(result).toMatchObject({ status: "SENT", autoReplySent: true, plannerAlertSent: true });
    expect(sent.map((email) => email.to)).toEqual([lead.email, planner]);
    const text = sent[1]?.text ?? "";
    for (const line of [
      "Phone: Not provided",
      "Ceremony: Not provided",
      "Event date: Not provided",
      "Date flexible: No",
      "Guest estimate: Not provided",
      "Area: Not provided",
      "Message:\nNot provided",
    ]) {
      expect(text).toContain(line);
    }
  });

  it("sends the alert to the public contact email when no alert address is set anywhere", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAIL", "");
    vi.stubEnv("CONTACT_EMAIL", "");
    const lead = await createLead();
    const { adapter, sent } = createRecordingAdapter();
    const result = await run(lead.id, { emailAdapter: adapter });
    expect(result).toMatchObject({ status: "SENT", autoReplySent: true, plannerAlertSent: true });
    expect(sent.map((email) => email.to)).toEqual([lead.email, "appilico.au@gmail.com"]);
  });

  it("follows the contact email staff saved, and prefers the alert address they set", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAIL", "old-env@test.managevent.invalid");
    await db.siteSetting.create({
      data: { id: "site", contactEmail: "contact-" + planner, contactPhone: "" },
    });
    // Environment alert address still wins over the contact email until staff set their own.
    const first = createRecordingAdapter();
    const leadA = await createLead();
    await run(leadA.id, { emailAdapter: first.adapter });
    expect(first.sent.map((email) => email.to)).toEqual([
      leadA.email,
      "old-env@test.managevent.invalid",
    ]);

    await db.siteSetting.update({ where: { id: "site" }, data: { notificationEmail: planner } });
    const second = createRecordingAdapter();
    const leadB = await createLead();
    await run(leadB.id, { emailAdapter: second.adapter });
    expect(second.sent.map((email) => email.to)).toEqual([leadB.email, planner]);
  });

  it("records NOT_CONFIGURED and sends nothing when email is not set up, then sends once it is", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("LEAD_NOTIFICATION_EMAIL", planner);
    const lead = await createLead();

    const first = await run(lead.id, {});
    expect(first).toEqual({
      status: "NOT_CONFIGURED",
      alreadySent: false,
      autoReplySent: false,
      plannerAlertSent: false,
    });
    const recorded = await messagesFor(lead.id);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      status: "NOT_CONFIGURED",
      providerId: `lead-auto-reply:${lead.id}`,
      to: hashEmailAddress(lead.email),
      sentAt: null,
    });

    // Running again does not pile up rows.
    await run(lead.id, {});
    expect(await messagesFor(lead.id)).toHaveLength(1);

    // With a provider the same lead is emailed and the row becomes SENT.
    const { adapter, sent } = createRecordingAdapter();
    const later = await run(lead.id, { emailAdapter: adapter });
    expect(later).toMatchObject({ status: "SENT", autoReplySent: true, plannerAlertSent: true });
    expect(sent).toHaveLength(2);
    const after = await messagesFor(lead.id);
    expect(after.map((message) => message.status)).toEqual(["SENT", "SENT"]);
    expect(after[0]?.sentAt).not.toBeNull();
  });

  it("does nothing for a lead that does not exist or was deleted", async () => {
    const { adapter, sent } = createRecordingAdapter();
    const missing = await run(generateId("lead_"), {
      emailAdapter: adapter,
      plannerInboxEmail: planner,
    });
    expect(missing.status).toBe("LEAD_NOT_FOUND");

    const lead = await createLead({ deletedAt: new Date() });
    const deleted = await run(lead.id, { emailAdapter: adapter, plannerInboxEmail: planner });
    expect(deleted.status).toBe("LEAD_NOT_FOUND");
    expect(sent).toHaveLength(0);
    expect(await messagesFor(lead.id)).toHaveLength(0);
  });

  it("retries the planner alert alone when it failed after the auto-reply went out", async () => {
    const lead = await createLead();
    const failing = createRecordingAdapter({ failFor: [planner] });
    await expect(
      run(lead.id, { emailAdapter: failing.adapter, plannerInboxEmail: planner }),
    ).rejects.toThrow();
    expect((await messagesFor(lead.id)).map((message) => message.providerId)).toEqual([
      `lead-auto-reply:${lead.id}`,
    ]);

    const working = createRecordingAdapter();
    const retried = await run(lead.id, {
      emailAdapter: working.adapter,
      plannerInboxEmail: planner,
    });
    expect(retried).toMatchObject({ status: "SENT", autoReplySent: false, plannerAlertSent: true });
    expect(working.sent.map((email) => email.to)).toEqual([planner]);
  });
});
