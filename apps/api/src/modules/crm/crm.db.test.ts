/**
 * Staff CRM inbox against the real database. Leads are created through the public route with
 * unique emails and removed (with their consent, audit and message rows) in `afterAll`.
 */
import { db } from "@managevent/db";
import type { LeadResponse } from "@managevent/types";
import { LeadDetailSchema, LeadListSchema, LeadResponseSchema } from "@managevent/validators";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbAvailable } from "../../test/db.js";
import { createTestApi, HostWorld, uniqueTestSuffix } from "../guest-list/test-fixtures.js";

type ErrorBody = { error: { code: string } };

describe.skipIf(!dbAvailable)("CRM inbox (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();
  /** Unique per run, so searching for it finds exactly this file's leads. */
  const marker = `crm${uniqueTestSuffix()}`;
  let staff: Awaited<ReturnType<HostWorld["createUser"]>>;
  let admin: Awaited<ReturnType<HostWorld["createUser"]>>;
  let host: Awaited<ReturnType<HostWorld["createUser"]>>;
  const leads: LeadResponse[] = [];

  async function submitLead(
    index: number,
    extra: Record<string, unknown> = {},
  ): Promise<LeadResponse> {
    const res = await api.call(null, "POST", "/v1/leads", {
      source: "CONTACT_FORM",
      name: `Lead ${index} ${marker}`,
      email: `lead-${index}-${marker}@test.managevent.invalid`,
      preferredLanguage: "en",
      preferredChannel: "EMAIL",
      ...extra,
    });
    expect(res.status).toBe(201);
    const lead = LeadResponseSchema.parse(await res.json());
    world.trackLead(lead.id);
    return lead;
  }

  beforeAll(async () => {
    staff = await world.createUser(["PLANNER_STAFF"]);
    admin = await world.createUser(["SUPER_ADMIN"]);
    host = await world.createUser(["CUSTOMER_HOST"]);
    leads.push(
      await submitLead(1, {
        phone: "+61412345678",
        ceremonySlug: "wedding",
        eventDate: "2027-03-14T00:00:00.000Z",
        dateFlexible: true,
        guestEstimate: 120,
        area: "Swan Valley",
        message: "We would love a garden ceremony.",
        marketingConsent: true,
        utm: { source: "instagram", campaign: "spring" },
      }),
    );
    leads.push(await submitLead(2));
    leads.push(await submitLead(3));
  });

  afterAll(async () => {
    await world.cleanup();
  });

  it("enqueues lead.created with the lead id only, never contact details", () => {
    const jobs = api.queue.jobs.filter((job) => job.name === "lead.created");
    expect(jobs.map((job) => job.payload)).toEqual(leads.map((lead) => ({ leadId: lead.id })));
    expect(jobs[0]?.opts.singletonKey).toBe(`lead.created:${leads[0]?.id}`);
    expect(JSON.stringify(jobs)).not.toContain("@");
  });

  it("is for staff only", async () => {
    const leadPath = `/v1/leads/${leads[0]?.id}`;
    const attempts: Array<[string, string, unknown?]> = [
      ["GET", "/v1/leads"],
      ["GET", leadPath],
      ["PATCH", leadPath, { stage: "QUALIFIED" }],
    ];
    for (const [method, path, body] of attempts) {
      expect((await api.call(null, method, path, body)).status, `${method} ${path}`).toBe(401);
      const asHost = await api.call(host, method, path, body);
      expect(asHost.status, `${method} ${path}`).toBe(403);
      expect(await asHost.text()).not.toContain(marker);
    }
    expect((await db.lead.findUniqueOrThrow({ where: { id: leads[0]?.id ?? "" } })).stage).toBe(
      "NEW",
    );
  });

  it("lists newest first with search, stage filter and cursor paging", async () => {
    const list = async (query: string) => {
      const res = await api.call(staff, "GET", `/v1/leads?${query}`);
      expect(res.status).toBe(200);
      return LeadListSchema.parse(await res.json());
    };
    const newestFirst = [...leads].reverse().map((lead) => lead.id);

    const all = await list(`q=${marker}`);
    expect(all.items.map((lead) => lead.id)).toEqual(newestFirst);
    expect(all.nextCursor).toBeNull();

    const firstPage = await list(`q=${marker}&limit=2`);
    expect(firstPage.items.map((lead) => lead.id)).toEqual(newestFirst.slice(0, 2));
    expect(firstPage.nextCursor).toBe(newestFirst[1]);
    const secondPage = await list(`q=${marker}&limit=2&cursor=${firstPage.nextCursor}`);
    expect(secondPage.items.map((lead) => lead.id)).toEqual(newestFirst.slice(2));
    expect(secondPage.nextCursor).toBeNull();

    // Search is case-insensitive and also covers the email and the area.
    expect((await list(`q=LEAD-2-${marker.toUpperCase()}`)).items.map((lead) => lead.id)).toEqual([
      leads[1]?.id,
    ]);
    expect((await list(`q=${marker}&stage=BOOKED`)).items).toEqual([]);
    expect((await list(`q=${marker}&stage=NEW`)).items).toHaveLength(3);

    expect((await api.call(staff, "GET", "/v1/leads?limit=500")).status).toBe(400);
    expect((await api.call(staff, "GET", "/v1/leads?stage=NOPE")).status).toBe(400);
    // Without a query the inbox still answers (superset of the old `{ items }` response).
    expect(Array.isArray((await list("")).items)).toBe(true);
  });

  it("returns the full lead to staff", async () => {
    const res = await api.call(admin, "GET", `/v1/leads/${leads[0]?.id}`);
    expect(res.status).toBe(200);
    const detail = LeadDetailSchema.parse(await res.json());
    expect(detail).toMatchObject({
      id: leads[0]?.id,
      stage: "NEW",
      phone: "+61412345678",
      ceremonySlug: "wedding",
      eventDate: "2027-03-14T00:00:00.000Z",
      dateFlexible: true,
      guestEstimate: 120,
      area: "Swan Valley",
      message: "We would love a garden ceremony.",
      utm: { source: "instagram", campaign: "spring" },
      notes: null,
      assignedToUserId: null,
      eventId: null,
      marketingConsent: true,
    });

    const plain = LeadDetailSchema.parse(
      await (await api.call(staff, "GET", `/v1/leads/${leads[1]?.id}`)).json(),
    );
    expect(plain).toMatchObject({ message: null, utm: null, marketingConsent: false });

    expect(
      (await api.call(staff, "GET", "/v1/leads/lead_00000000-0000-7000-8000-000000000000")).status,
    ).toBe(404);
    expect((await api.call(staff, "GET", "/v1/leads/not-a-lead-id")).status).toBe(404);
  });

  it("updates stage, notes and assignee, and audits what changed without the notes text", async () => {
    const path = `/v1/leads/${leads[2]?.id}`;
    const res = await api.call(
      staff,
      "PATCH",
      path,
      {
        stage: "QUALIFIED",
        notes: "Called on Tuesday. Budget is confidential.",
        assignedToUserId: admin.userId,
      },
      { "x-forwarded-for": "203.0.113.20" },
    );
    expect(res.status).toBe(200);
    const updated = LeadDetailSchema.parse(await res.json());
    expect(updated).toMatchObject({
      stage: "QUALIFIED",
      notes: "Called on Tuesday. Budget is confidential.",
      assignedToUserId: admin.userId,
    });

    const audit = await db.auditLog.findMany({
      where: { action: "lead.update", entityId: leads[2]?.id ?? "" },
      orderBy: { at: "asc" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorUserId: staff.userId,
      actorRole: "PLANNER_STAFF",
      entity: "Lead",
      ip: "203.0.113.20",
    });
    expect(audit[0]?.diffJson).toEqual({
      stage: { from: "NEW", to: "QUALIFIED" },
      notesChanged: true,
      assignee: { from: null, to: admin.userId },
    });
    expect(JSON.stringify(audit[0]?.diffJson)).not.toContain("confidential");

    // Sending the same values again changes nothing and writes no audit row.
    const same = await api.call(staff, "PATCH", path, { stage: "QUALIFIED" });
    expect(same.status).toBe(200);
    expect(
      await db.auditLog.count({ where: { action: "lead.update", entityId: leads[2]?.id ?? "" } }),
    ).toBe(1);

    // Notes and assignee can be cleared.
    const cleared = LeadDetailSchema.parse(
      await (await api.call(admin, "PATCH", path, { notes: null, assignedToUserId: null })).json(),
    );
    expect(cleared).toMatchObject({ stage: "QUALIFIED", notes: null, assignedToUserId: null });
    const second = await db.auditLog.findMany({
      where: { action: "lead.update", entityId: leads[2]?.id ?? "" },
      orderBy: { at: "asc" },
    });
    expect(second).toHaveLength(2);
    expect(second[1]?.diffJson).toEqual({
      notesChanged: true,
      assignee: { from: admin.userId, to: null },
    });

    const filtered = LeadListSchema.parse(
      await (await api.call(staff, "GET", `/v1/leads?q=${marker}&stage=QUALIFIED`)).json(),
    );
    expect(filtered.items.map((lead) => lead.id)).toEqual([leads[2]?.id]);
  });

  it("rejects an empty update, an unknown stage, a non-staff assignee and an unknown lead", async () => {
    const path = `/v1/leads/${leads[1]?.id}`;
    for (const body of [{}, { stage: "WON" }, { notes: "x".repeat(5001) }]) {
      const res = await api.call(staff, "PATCH", path, body);
      expect(res.status).toBe(400);
      expect(((await res.json()) as ErrorBody).error.code).toBe("VALIDATION_ERROR");
    }

    const notStaff = await api.call(staff, "PATCH", path, { assignedToUserId: host.userId });
    expect(notStaff.status).toBe(400);
    expect(((await notStaff.json()) as ErrorBody).error.code).toBe("VALIDATION_ERROR");

    const unknown = await api.call(
      staff,
      "PATCH",
      "/v1/leads/lead_00000000-0000-7000-8000-000000000000",
      {
        stage: "LOST",
      },
    );
    expect(unknown.status).toBe(404);

    const stored = await db.lead.findUniqueOrThrow({ where: { id: leads[1]?.id ?? "" } });
    expect(stored).toMatchObject({ stage: "NEW", notes: null, assignedToUserId: null });
    expect(await db.auditLog.count({ where: { entity: "Lead", entityId: stored.id } })).toBe(0);
  });

  it("answers a double submit with one lead: 201 and 200, never 500, and no consent without a lead", async () => {
    const jobsBefore = api.queue.jobs.filter((job) => job.name === "lead.created").length;
    // An address only this run uses, so its consent records can be found whatever they point at.
    const ip = `198.18.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
    const pairs = 6;
    const leadIds: string[] = [];
    try {
      for (let pair = 0; pair < pairs; pair += 1) {
        const email = `lead-double-${pair}-${marker}@test.managevent.invalid`;
        const submit = () =>
          api.call(
            null,
            "POST",
            "/v1/leads",
            {
              source: "CONTACT_FORM",
              name: `Double ${pair} ${marker}`,
              email,
              preferredLanguage: "en",
              preferredChannel: "EMAIL",
              marketingConsent: true,
            },
            { "idempotency-key": `lead-double-${pair}-${marker}`, "x-forwarded-for": ip },
          );
        // A double click: two identical requests at the same moment.
        const responses = await Promise.all([submit(), submit()]);
        const stored = await db.lead.findMany({ where: { email }, select: { id: true } });
        for (const lead of stored) {
          world.trackLead(lead.id);
          leadIds.push(lead.id);
        }
        expect(responses.map((res) => res.status).sort(), `pair ${pair}`).toEqual([200, 201]);
        const bodies = await Promise.all(
          responses.map(async (res) => LeadResponseSchema.parse(await res.json())),
        );
        // One lead, and both answers are that lead.
        expect(stored).toHaveLength(1);
        expect(bodies.map((lead) => lead.id)).toEqual([stored[0]?.id, stored[0]?.id]);
      }

      // Exactly one marketing consent per lead, each attached to a lead that exists.
      const consents = await db.consentRecord.findMany({
        where: { subjectType: "LEAD", purpose: "MARKETING_EMAIL", ip },
        select: { subjectId: true },
      });
      expect(consents.map((consent) => consent.subjectId).sort()).toEqual([...leadIds].sort());
      // One job per lead, not per request.
      expect(api.queue.jobs.filter((job) => job.name === "lead.created").length).toBe(
        jobsBefore + pairs,
      );
    } finally {
      // Whatever happened above, nothing made here outlives the test.
      await db.consentRecord.deleteMany({
        where: { subjectType: "LEAD", purpose: "MARKETING_EMAIL", ip },
      });
    }
  });
});
