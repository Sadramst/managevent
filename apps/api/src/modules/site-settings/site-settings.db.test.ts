/**
 * Staff-editable contact details against the real database.
 *
 * `SiteSetting` is one shared row, and the local database is shared with a developer's real data,
 * so the suite saves the existing row first and puts it back in `afterAll`.
 */
import { db } from "@managevent/db";
import {
  AdminSiteSettingsSchema,
  DEFAULT_CONTACT_EMAIL,
  PublicSiteSettingsSchema,
} from "@managevent/validators";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbAvailable } from "../../test/db.js";
import { createTestApi, HostWorld } from "../guest-list/test-fixtures.js";
import { SITE_SETTING_ID } from "./repo.js";

type ErrorBody = { error: { code: string } };

describe.skipIf(!dbAvailable)("Site settings (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();
  let staff: Awaited<ReturnType<HostWorld["createUser"]>>;
  let admin: Awaited<ReturnType<HostWorld["createUser"]>>;
  let host: Awaited<ReturnType<HostWorld["createUser"]>>;
  let saved: Awaited<ReturnType<typeof db.siteSetting.findUnique>>;
  const env = { ...process.env };

  const validBody = {
    contactEmail: "Hello@Test.Managevent.invalid",
    contactPhone: "08 9123 4567",
    notificationEmail: "",
  };

  beforeAll(async () => {
    staff = await world.createUser(["PLANNER_STAFF"]);
    admin = await world.createUser(["SUPER_ADMIN"]);
    host = await world.createUser(["CUSTOMER_HOST"]);
    saved = await db.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
  });

  beforeEach(async () => {
    delete process.env.CONTACT_EMAIL;
    delete process.env.CONTACT_PHONE;
    delete process.env.LEAD_NOTIFICATION_EMAIL;
    await db.siteSetting.deleteMany({ where: { id: SITE_SETTING_ID } });
    await db.auditLog.deleteMany({
      where: {
        entity: "SiteSetting",
        actorUserId: { in: [staff.userId, admin.userId, host.userId] },
      },
    });
  });

  afterAll(async () => {
    process.env = env;
    await db.auditLog.deleteMany({
      where: {
        entity: "SiteSetting",
        actorUserId: { in: [staff.userId, admin.userId, host.userId] },
      },
    });
    await db.siteSetting.deleteMany({ where: { id: SITE_SETTING_ID } });
    if (saved) await db.siteSetting.create({ data: saved });
    await world.cleanup();
  });

  it("answers the first-run default before anyone has saved: the built-in email and no phone", async () => {
    const res = await api.call(null, "GET", "/v1/site-settings");
    expect(res.status).toBe(200);
    expect(PublicSiteSettingsSchema.parse(await res.json())).toEqual({
      contactEmail: DEFAULT_CONTACT_EMAIL,
      contactPhone: "",
    });
    expect(res.headers.get("cache-control")).toContain("max-age");
  });

  it("uses CONTACT_EMAIL and CONTACT_PHONE as first-run defaults", async () => {
    process.env.CONTACT_EMAIL = "env@test.managevent.invalid";
    process.env.CONTACT_PHONE = "0412 345 678";
    const body = PublicSiteSettingsSchema.parse(
      await (await api.call(null, "GET", "/v1/site-settings")).json(),
    );
    expect(body).toEqual({
      contactEmail: "env@test.managevent.invalid",
      contactPhone: "0412 345 678",
    });
  });

  it("is for staff only, and signed-out callers get 401", async () => {
    expect((await api.call(null, "GET", "/v1/admin/site-settings")).status).toBe(401);
    expect((await api.call(null, "PUT", "/v1/admin/site-settings", validBody)).status).toBe(401);
    for (const who of [host]) {
      const read = await api.call(who, "GET", "/v1/admin/site-settings");
      expect(read.status).toBe(403);
      expect(((await read.json()) as ErrorBody).error.code).toBe("FORBIDDEN");
      expect((await api.call(who, "PUT", "/v1/admin/site-settings", validBody)).status).toBe(403);
    }
    expect(await db.siteSetting.count({ where: { id: SITE_SETTING_ID } })).toBe(0);
  });

  it("saves for staff and for a super admin, and every visitor then sees the change", async () => {
    const res = await api.call(staff, "PUT", "/v1/admin/site-settings", validBody);
    expect(res.status).toBe(200);
    const saved1 = AdminSiteSettingsSchema.parse(await res.json());
    expect(saved1).toMatchObject({
      contactEmail: "hello@test.managevent.invalid",
      contactPhone: "08 9123 4567",
      notificationEmail: "hello@test.managevent.invalid",
      notificationEmailIsCustom: false,
    });
    expect(saved1.updatedAt).not.toBeNull();

    const publicBody = PublicSiteSettingsSchema.parse(
      await (await api.call(null, "GET", "/v1/site-settings")).json(),
    );
    expect(publicBody).toEqual({
      contactEmail: "hello@test.managevent.invalid",
      contactPhone: "08 9123 4567",
    });

    const second = await api.call(admin, "PUT", "/v1/admin/site-settings", {
      contactEmail: "team@test.managevent.invalid",
      contactPhone: "",
      notificationEmail: "alerts@test.managevent.invalid",
    });
    expect(second.status).toBe(200);
    expect(AdminSiteSettingsSchema.parse(await second.json())).toMatchObject({
      contactPhone: "",
      notificationEmail: "alerts@test.managevent.invalid",
      notificationEmailIsCustom: true,
    });
    const row = await db.siteSetting.findUniqueOrThrow({ where: { id: SITE_SETTING_ID } });
    expect(row.updatedByUserId).toBe(admin.userId);
    expect(await db.siteSetting.count()).toBe(1);
  });

  it("never exposes the alert address on the public route", async () => {
    await api.call(staff, "PUT", "/v1/admin/site-settings", {
      ...validBody,
      notificationEmail: "private-alerts@test.managevent.invalid",
    });
    const text = await (await api.call(null, "GET", "/v1/site-settings")).text();
    expect(text).not.toContain("private-alerts");
    expect(text).not.toContain("notification");
  });

  it("keeps a phone that staff blanked, even when CONTACT_PHONE is set", async () => {
    process.env.CONTACT_PHONE = "0412 345 678";
    await api.call(staff, "PUT", "/v1/admin/site-settings", { ...validBody, contactPhone: "" });
    const body = PublicSiteSettingsSchema.parse(
      await (await api.call(null, "GET", "/v1/site-settings")).json(),
    );
    expect(body.contactPhone).toBe("");
  });

  it("rejects an invalid email, phone or missing field with 400 and saves nothing", async () => {
    for (const body of [
      { ...validBody, contactEmail: "not-an-email" },
      { ...validBody, contactEmail: "" },
      { ...validBody, contactPhone: "call me maybe" },
      { ...validBody, notificationEmail: "nope" },
      { contactEmail: validBody.contactEmail },
    ]) {
      const res = await api.call(staff, "PUT", "/v1/admin/site-settings", body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(((await res.json()) as ErrorBody).error.code).toBe("VALIDATION_ERROR");
    }
    expect(await db.siteSetting.count({ where: { id: SITE_SETTING_ID } })).toBe(0);
  });

  it("audits which fields changed, never their values", async () => {
    await api.call(staff, "PUT", "/v1/admin/site-settings", validBody, {
      "x-forwarded-for": "203.0.113.30",
    });
    await api.call(staff, "PUT", "/v1/admin/site-settings", {
      ...validBody,
      contactPhone: "1300 123 456",
    });
    const rows = await db.auditLog.findMany({
      where: { action: "site_settings.update", actorUserId: staff.userId },
      orderBy: { at: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ entity: "SiteSetting", entityId: SITE_SETTING_ID });
    expect(rows[0]?.diffJson).toEqual({
      contactEmailChanged: true,
      contactPhoneChanged: true,
      notificationEmailChanged: true,
    });
    expect(rows[1]?.diffJson).toEqual({
      contactEmailChanged: false,
      contactPhoneChanged: true,
      notificationEmailChanged: false,
    });
    const text = JSON.stringify(rows.map((row) => row.diffJson));
    expect(text).not.toContain("test.managevent.invalid");
    expect(text).not.toContain("1300");
  });
});
