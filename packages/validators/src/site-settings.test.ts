import { describe, expect, it } from "vitest";
import {
  AdminSiteSettingsSchema,
  DEFAULT_CONTACT_EMAIL,
  PublicSiteSettingsSchema,
  resolveSiteSettings,
  type SiteSettingsRow,
  SiteSettingsUpdateSchema,
} from "./index.js";

describe("site settings schemas", () => {
  it("accepts a full update, trims and lower-cases the addresses", () => {
    const parsed = SiteSettingsUpdateSchema.parse({
      contactEmail: "  Hello@Example.com.au ",
      contactPhone: " 0412 345 678 ",
      notificationEmail: "Team@Example.com.au",
    });
    expect(parsed).toEqual({
      contactEmail: "hello@example.com.au",
      contactPhone: "0412 345 678",
      notificationEmail: "team@example.com.au",
    });
  });

  it("lets staff blank the phone and the alert address", () => {
    const parsed = SiteSettingsUpdateSchema.parse({
      contactEmail: "hello@example.com.au",
      contactPhone: "",
      notificationEmail: "",
    });
    expect(parsed.contactPhone).toBe("");
    expect(parsed.notificationEmail).toBe("");
  });

  it("accepts 13/1300 and international formats", () => {
    for (const contactPhone of ["1300 123 456", "13 12 34", "+61 8 9123 4567", "(08) 9123 4567"]) {
      const result = SiteSettingsUpdateSchema.safeParse({
        contactEmail: "hello@example.com.au",
        contactPhone,
        notificationEmail: "",
      });
      expect(result.success, contactPhone).toBe(true);
    }
  });

  it("rejects a bad email, a bad phone and a missing field", () => {
    const base = { contactEmail: "hello@example.com.au", contactPhone: "", notificationEmail: "" };
    expect(SiteSettingsUpdateSchema.safeParse({ ...base, contactEmail: "nope" }).success).toBe(
      false,
    );
    expect(SiteSettingsUpdateSchema.safeParse({ ...base, contactEmail: "" }).success).toBe(false);
    expect(SiteSettingsUpdateSchema.safeParse({ ...base, contactPhone: "call me" }).success).toBe(
      false,
    );
    expect(SiteSettingsUpdateSchema.safeParse({ ...base, notificationEmail: "x" }).success).toBe(
      false,
    );
    expect(SiteSettingsUpdateSchema.safeParse({ contactEmail: base.contactEmail }).success).toBe(
      false,
    );
  });

  it("public output carries no internal fields", () => {
    expect(
      PublicSiteSettingsSchema.parse({
        contactEmail: "a@b.co",
        contactPhone: "",
        notificationEmail: "secret@b.co",
      }),
    ).toEqual({ contactEmail: "a@b.co", contactPhone: "" });
    expect(
      AdminSiteSettingsSchema.safeParse({
        contactEmail: "a@b.co",
        contactPhone: "",
        notificationEmail: "a@b.co",
        notificationEmailIsCustom: false,
        updatedAt: null,
      }).success,
    ).toBe(true);
  });
});

describe("resolveSiteSettings", () => {
  const saved = (over: Partial<SiteSettingsRow> = {}): SiteSettingsRow => ({
    contactEmail: null,
    contactPhone: null,
    notificationEmail: null,
    updatedAt: new Date("2026-11-13T00:00:00.000Z"),
    ...over,
  });

  it("falls back to the built-in default with no row and no environment", () => {
    expect(resolveSiteSettings(null)).toEqual({
      contactEmail: DEFAULT_CONTACT_EMAIL,
      contactPhone: "",
      notificationEmail: DEFAULT_CONTACT_EMAIL,
      notificationEmailIsCustom: false,
      updatedAt: null,
    });
    expect(DEFAULT_CONTACT_EMAIL).toBe("appilico.au@gmail.com");
  });

  it("uses the environment as the first-run default", () => {
    const settings = resolveSiteSettings(null, {
      CONTACT_EMAIL: "env@example.com",
      CONTACT_PHONE: "0412 345 678",
      LEAD_NOTIFICATION_EMAIL: "alerts@example.com",
    });
    expect(settings).toMatchObject({
      contactEmail: "env@example.com",
      contactPhone: "0412 345 678",
      notificationEmail: "alerts@example.com",
      notificationEmailIsCustom: false,
    });
  });

  it("prefers what staff saved, and the alert address follows the contact email", () => {
    const settings = resolveSiteSettings(
      saved({ contactEmail: "staff@example.com", contactPhone: "1300 123 456" }),
      { CONTACT_EMAIL: "env@example.com", CONTACT_PHONE: "0400 000 000" },
    );
    expect(settings).toMatchObject({
      contactEmail: "staff@example.com",
      contactPhone: "1300 123 456",
      notificationEmail: "staff@example.com",
      notificationEmailIsCustom: false,
      updatedAt: "2026-11-13T00:00:00.000Z",
    });
  });

  it("keeps a phone that staff blanked on purpose, even when the environment has one", () => {
    const settings = resolveSiteSettings(saved({ contactEmail: "a@b.co", contactPhone: "" }), {
      CONTACT_PHONE: "0400 000 000",
    });
    expect(settings.contactPhone).toBe("");
  });

  it("marks a staff-set alert address as custom and beats the environment", () => {
    const settings = resolveSiteSettings(saved({ notificationEmail: "team@example.com" }), {
      LEAD_NOTIFICATION_EMAIL: "old@example.com",
    });
    expect(settings.notificationEmail).toBe("team@example.com");
    expect(settings.notificationEmailIsCustom).toBe(true);
  });
});
