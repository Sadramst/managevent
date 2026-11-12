import { describe, expect, it } from "vitest";
import {
  CELEBRATION_THEME_IDS,
  CheckoutConfirmSchema,
  CheckoutCreateSchema,
  CheckoutSessionSchema,
  FREE_THEME_IDS,
  GateStyleEnum,
  HostEventCreateSchema,
  HostEventDetailSchema,
  HostEventListSchema,
  HostEventSummarySchema,
  HostEventUpdateSchema,
  HostInvitationSchema,
  HostInvitationUpdateSchema,
  HttpsUrlSchema,
  INVITATION_OCCASION_SLUGS,
  INVITATION_TEMPLATES,
  InvitationContentSchema,
  InvitationMusicSchema,
  InvitationOccasionSlugEnum,
  InvitationTemplateSlugEnum,
  InvitationThemeIdEnum,
  InvitationVenueSchema,
  LocalDateTimeSchema,
  MEMORIAL_THEME_IDS,
  MeResponseSchema,
  PlanEntitlementsSchema,
  PlanViewSchema,
  PublishRequirementEnum,
  PublishResultSchema,
  RsvpConfigSchema,
  ScheduleItemSchema,
  WellConfigSchema,
} from "./index.js";

const UUID = "0192b400-0000-7000-8000-000000000001";
const NOW = "2026-11-12T02:30:00.000Z";

const minimalContent = {
  version: 1,
  headline: "Sara & Ali",
  hosts: "The Ahmadi family",
  venue: null,
  coverImageUrl: null,
  music: { url: null, title: null, rightsAttested: false },
};

const invitation = {
  id: `inv_${UUID}`,
  eventSlug: "sara-ali-wedding-7kq2",
  templateSlug: "royal-classic",
  themeId: "royal-ivory",
  gateStyle: "wax-seal",
  plan: "FREE",
  effectivePlan: "FREE",
  isDemo: false,
  publishedAt: null,
  rsvpDeadline: null,
  rsvpDeadlineLocal: null,
  allowForwarding: true,
  wellMode: "NONE",
  content: minimalContent,
  rsvpConfig: {},
  wellConfig: {},
  previewPath: null,
  updatedAt: NOW,
};

const summary = {
  id: `evt_${UUID}`,
  title: "Sara & Ali",
  ceremonySlug: "wedding",
  experienceMode: "CELEBRATION",
  status: "DRAFT",
  startsAt: "2027-03-20T08:00:00.000Z",
  startsAtLocal: "2027-03-20T16:00",
  timeZone: "Australia/Perth",
  role: "OWNER",
  invitation: {
    id: invitation.id,
    eventSlug: invitation.eventSlug,
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    plan: "FREE",
    effectivePlan: "FREE",
    publishedAt: null,
  },
  counts: { parties: 0, guests: 0, yes: 0, pending: 0 },
  updatedAt: NOW,
};

const detail = {
  ...summary,
  endsAt: null,
  endsAtLocal: null,
  invitation,
  checklist: { hasWording: false, hasVenue: false, hasGuests: false, published: false },
};

const entitlements = {
  plan: "FREE",
  label: "Free Invitation",
  priceIncGstCents: 0,
  maxGuests: 30,
  maxEmailInvitations: 50,
  allThemesAndAnimations: false,
  rsvpAndDietary: true,
  rsvpReminders: false,
  customEventSlug: false,
  fullMusicLibraryAndUpload: false,
  allGateStyles: false,
  qrPassesAndCheckin: false,
  livePhotoWallAndDisplay: false,
  wellAndTributeExport: false,
  bulkSmsAndWhatsapp: false,
  pinProtection: false,
  removeBranding: false,
  automaticLogisticsBridge: false,
};

describe("@managevent/validators invitation-host", () => {
  describe("primitives", () => {
    it("HttpsUrlSchema accepts https and rejects http, other schemes and oversize values", () => {
      expect(HttpsUrlSchema.safeParse("https://example.com/cover.jpg").success).toBe(true);
      expect(HttpsUrlSchema.safeParse("http://example.com/cover.jpg").success).toBe(false);
      expect(HttpsUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
      expect(HttpsUrlSchema.safeParse("not a url").success).toBe(false);
      expect(HttpsUrlSchema.safeParse(`https://example.com/${"a".repeat(500)}`).success).toBe(
        false,
      );
    });

    it("LocalDateTimeSchema accepts YYYY-MM-DDTHH:mm and rejects offsets, seconds and impossible dates", () => {
      expect(LocalDateTimeSchema.safeParse("2027-03-20T16:00").success).toBe(true);
      expect(LocalDateTimeSchema.safeParse("2028-02-29T00:00").success).toBe(true);
      expect(LocalDateTimeSchema.safeParse("2027-03-20T16:00:00").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-03-20T16:00Z").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-03-20T24:00").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-03-20 16:00").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-02-29T10:00").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-13-01T10:00").success).toBe(false);
      expect(LocalDateTimeSchema.safeParse("2027-04-31T10:00").success).toBe(false);
    });

    it("GateStyleEnum and the occasion list are the agreed sets", () => {
      expect(GateStyleEnum.options).toEqual(["wax-seal", "ribbon", "arch", "plain-fade"]);
      expect(GateStyleEnum.safeParse("confetti").success).toBe(false);
      expect(INVITATION_OCCASION_SLUGS).toHaveLength(12);
      expect(InvitationOccasionSlugEnum.safeParse("celebration-of-life").success).toBe(true);
      expect(InvitationOccasionSlugEnum.safeParse("funeral").success).toBe(false);
    });
  });

  describe("template catalogue", () => {
    it("lists six templates whose defaults are consistent with their mode", () => {
      expect(INVITATION_TEMPLATES.map((template) => template.slug)).toEqual(
        InvitationTemplateSlugEnum.options,
      );
      const celebration = new Set<string>(CELEBRATION_THEME_IDS);
      const memorial = new Set<string>(MEMORIAL_THEME_IDS);
      for (const template of INVITATION_TEMPLATES) {
        expect(InvitationThemeIdEnum.safeParse(template.defaultThemeId).success).toBe(true);
        expect(GateStyleEnum.safeParse(template.defaultGateStyle).success).toBe(true);
        if (template.mode === "MEMORIAL") {
          expect(memorial.has(template.defaultThemeId)).toBe(true);
          expect(template.defaultGateStyle).toBe("plain-fade");
          expect(template.free).toBe(true);
        } else {
          expect(celebration.has(template.defaultThemeId)).toBe(true);
        }
        // A free template must default to a free theme, or a FREE event could not use it.
        if (template.free) {
          expect(FREE_THEME_IDS).toContain(template.defaultThemeId);
        }
      }
      expect(INVITATION_TEMPLATES.filter((template) => !template.free).map((t) => t.slug)).toEqual([
        "celestial-evening",
        "botanic-garden",
      ]);
      expect(InvitationTemplateSlugEnum.safeParse("classic-arch").success).toBe(false);
    });

    it("FREE_THEME_IDS is the agreed subset of real themes", () => {
      expect(FREE_THEME_IDS).toEqual([
        "royal-ivory",
        "alabaster-platinum",
        "memorial-alabaster",
        "memorial-slate",
      ]);
    });
  });

  describe("InvitationContentSchema", () => {
    it("applies defaults to a minimal document", () => {
      const parsed = InvitationContentSchema.parse(minimalContent);
      expect(parsed).toEqual({
        version: 1,
        headline: "Sara & Ali",
        subheadline: "",
        hosts: "The Ahmadi family",
        wording: "",
        story: [],
        schedule: [],
        venue: null,
        faq: [],
        coverImageUrl: null,
        galleryImageUrls: [],
        music: { enabled: false, url: null, title: null, rightsAttested: false },
      });
    });

    it("accepts a full document", () => {
      const parsed = InvitationContentSchema.safeParse({
        ...minimalContent,
        subheadline: "Together with their families",
        honoureeName: "Margaret Hale",
        wording: "Please join us\nfor an evening by the river.",
        story: ["We met in 2019."],
        schedule: [
          { id: "sch_1", time: "16:00", title: "Ceremony", location: "Rose garden" },
          { id: "sch_2", time: "18:30", title: "Dinner", description: "Seated dinner" },
        ],
        venue: {
          name: "Riverside Pavilion",
          address: "1 River Road, Perth WA",
          mapsUrl: "https://maps.example.com/riverside",
          parking: "Street parking on River Road",
        },
        dressCode: "Cocktail",
        faq: [{ question: "Are children welcome?", answer: "Yes." }],
        coverImageUrl: "https://images.example.com/cover.jpg",
        galleryImageUrls: ["https://images.example.com/1.jpg"],
        music: {
          enabled: true,
          url: "https://audio.example.com/track.mp3",
          title: "First dance",
          rightsAttested: true,
        },
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects a wrong version, blank headline, http media and oversize lists", () => {
      expect(InvitationContentSchema.safeParse({ ...minimalContent, version: 2 }).success).toBe(
        false,
      );
      expect(
        InvitationContentSchema.safeParse({ ...minimalContent, headline: "   " }).success,
      ).toBe(false);
      expect(InvitationContentSchema.safeParse({ ...minimalContent, hosts: "" }).success).toBe(
        false,
      );
      expect(
        InvitationContentSchema.safeParse({
          ...minimalContent,
          coverImageUrl: "http://images.example.com/cover.jpg",
        }).success,
      ).toBe(false);
      expect(
        InvitationContentSchema.safeParse({
          ...minimalContent,
          faq: Array.from({ length: 13 }, () => ({ question: "Q", answer: "A" })),
        }).success,
      ).toBe(false);
      expect(
        InvitationContentSchema.safeParse({
          ...minimalContent,
          story: Array.from({ length: 9 }, () => "paragraph"),
        }).success,
      ).toBe(false);
      expect(
        InvitationContentSchema.safeParse({ ...minimalContent, wording: "x".repeat(1201) }).success,
      ).toBe(false);
    });

    it("ScheduleItemSchema and InvitationVenueSchema validate their fields", () => {
      expect(
        ScheduleItemSchema.safeParse({ id: "sch_1", time: "09:05", title: "Tea" }).success,
      ).toBe(true);
      expect(
        ScheduleItemSchema.safeParse({ id: "sch_1", time: "9:05", title: "Tea" }).success,
      ).toBe(false);
      expect(ScheduleItemSchema.safeParse({ id: "abc", time: "09:05", title: "Tea" }).success).toBe(
        false,
      );
      expect(InvitationVenueSchema.safeParse({ name: "Hall", address: "" }).success).toBe(true);
      expect(InvitationVenueSchema.safeParse({ name: "", address: "1 Road" }).success).toBe(false);
      expect(
        InvitationVenueSchema.safeParse({ name: "Hall", address: "", mapsUrl: "http://maps" })
          .success,
      ).toBe(false);
    });

    it("InvitationMusicSchema requires a URL and a rights attestation once enabled", () => {
      expect(
        InvitationMusicSchema.safeParse({ url: null, title: null, rightsAttested: false }).success,
      ).toBe(true);
      const noUrl = InvitationMusicSchema.safeParse({
        enabled: true,
        url: null,
        title: null,
        rightsAttested: true,
      });
      expect(noUrl.success).toBe(false);
      const noRights = InvitationMusicSchema.safeParse({
        enabled: true,
        url: "https://audio.example.com/track.mp3",
        title: null,
        rightsAttested: false,
      });
      expect(noRights.success).toBe(false);
      if (!noRights.success) {
        expect(noRights.error.issues[0]?.path).toEqual(["rightsAttested"]);
      }
    });
  });

  describe("RSVP and well configuration", () => {
    it("RsvpConfigSchema fills the agreed defaults and rejects unknown prompts", () => {
      expect(RsvpConfigSchema.parse({})).toEqual({
        allowMaybe: false,
        askDietary: true,
        askAccessibility: true,
        songPrompt: "STANDARD",
        askMessage: true,
        askContact: false,
      });
      expect(RsvpConfigSchema.safeParse({ songPrompt: "KARAOKE" }).success).toBe(false);
    });

    it("WellConfigSchema validates bank details and links", () => {
      expect(WellConfigSchema.safeParse({}).success).toBe(true);
      expect(
        WellConfigSchema.safeParse({
          message: "Your presence is our gift.",
          payId: "sara@example.com",
          bsb: "066-123",
          accountNumber: "12345678",
          accountName: "S Ahmadi",
          registryUrl: "https://registry.example.com/sara-ali",
        }).success,
      ).toBe(true);
      expect(WellConfigSchema.safeParse({ bsb: "066123" }).success).toBe(true);
      expect(WellConfigSchema.safeParse({ bsb: "06-6123" }).success).toBe(false);
      expect(WellConfigSchema.safeParse({ accountNumber: "123" }).success).toBe(false);
      expect(WellConfigSchema.safeParse({ donationUrl: "http://give.example.com" }).success).toBe(
        false,
      );
      expect(WellConfigSchema.safeParse({ tributePrompt: "x".repeat(301) }).success).toBe(false);
    });
  });

  describe("identity", () => {
    it("MeResponseSchema accepts signed-out and signed-in shapes", () => {
      const capabilities = {
        emailPassword: true,
        magicLink: false,
        passwordReset: false,
        emailInvitations: false,
        stripeCheckout: false,
      };
      expect(MeResponseSchema.safeParse({ user: null, capabilities }).success).toBe(true);
      expect(
        MeResponseSchema.safeParse({
          user: {
            id: `usr_${UUID}`,
            email: "host@example.com",
            name: "Host",
            roles: ["CUSTOMER_HOST"],
            emailVerified: false,
            twoFactorEnabled: false,
          },
          capabilities,
        }).success,
      ).toBe(true);
      expect(
        MeResponseSchema.safeParse({
          user: null,
          capabilities: { ...capabilities, emailPassword: false },
        }).success,
      ).toBe(false);
      expect(
        MeResponseSchema.safeParse({
          user: {
            id: "user-1",
            email: "host@example.com",
            name: "Host",
            roles: ["OWNER"],
            emailVerified: false,
            twoFactorEnabled: false,
          },
          capabilities,
        }).success,
      ).toBe(false);
    });
  });

  describe("events", () => {
    it("HostEventCreateSchema defaults the time zone and validates the catalogue values", () => {
      const parsed = HostEventCreateSchema.parse({
        title: "  Sara & Ali  ",
        ceremonySlug: "wedding",
        startsAtLocal: "2027-03-20T16:00",
        templateSlug: "royal-classic",
        hosts: "The Ahmadi family",
      });
      expect(parsed.timeZone).toBe("Australia/Perth");
      expect(parsed.title).toBe("Sara & Ali");

      const base = {
        title: "Sara & Ali",
        ceremonySlug: "wedding",
        startsAtLocal: "2027-03-20T16:00",
        templateSlug: "royal-classic",
        hosts: "The Ahmadi family",
      };
      expect(HostEventCreateSchema.safeParse({ ...base, title: "" }).success).toBe(false);
      expect(HostEventCreateSchema.safeParse({ ...base, ceremonySlug: "rave" }).success).toBe(
        false,
      );
      expect(HostEventCreateSchema.safeParse({ ...base, templateSlug: "unknown" }).success).toBe(
        false,
      );
      expect(HostEventCreateSchema.safeParse({ ...base, timeZone: "Mars/Olympus" }).success).toBe(
        false,
      );
      expect(
        HostEventCreateSchema.safeParse({ ...base, startsAtLocal: "2027-03-20T16:00:00.000Z" })
          .success,
      ).toBe(false);
      expect(
        HostEventCreateSchema.safeParse({ ...base, venue: { name: "", address: "x" } }).success,
      ).toBe(false);
      expect(
        HostEventCreateSchema.safeParse({
          ...base,
          themeId: "memorial-slate",
          honoureeName: "Margaret Hale",
          endsAtLocal: "2027-03-20T22:00",
          venue: { name: "Hall", address: "1 Road" },
        }).success,
      ).toBe(true);
    });

    it("HostEventUpdateSchema is partial, allows clearing the end, and never carries ceremonySlug", () => {
      expect(HostEventUpdateSchema.parse({})).toEqual({});
      expect(HostEventUpdateSchema.parse({ endsAtLocal: null })).toEqual({ endsAtLocal: null });
      expect(HostEventUpdateSchema.parse({ ceremonySlug: "wake", title: "New" })).toEqual({
        title: "New",
      });
      expect(HostEventUpdateSchema.safeParse({ startsAtLocal: null }).success).toBe(false);
      expect(HostEventUpdateSchema.safeParse({ timeZone: "Nowhere" }).success).toBe(false);
    });

    it("HostInvitationUpdateSchema is partial and validates each field", () => {
      expect(HostInvitationUpdateSchema.parse({})).toEqual({});
      expect(
        HostInvitationUpdateSchema.safeParse({
          templateSlug: "botanic-garden",
          themeId: "emerald-botanic",
          gateStyle: "arch",
          content: minimalContent,
          rsvpDeadlineLocal: null,
          rsvpConfig: { allowMaybe: true },
          allowForwarding: false,
          wellMode: "WISHING_WELL",
          wellConfig: { message: "Thank you" },
          eventSlugWords: "sara-and-ali",
          expectedUpdatedAt: NOW,
        }).success,
      ).toBe(true);
      expect(HostInvitationUpdateSchema.safeParse({ eventSlugWords: "Sara Ali" }).success).toBe(
        false,
      );
      expect(HostInvitationUpdateSchema.safeParse({ eventSlugWords: "sara--ali" }).success).toBe(
        false,
      );
      expect(HostInvitationUpdateSchema.safeParse({ eventSlugWords: "a".repeat(61) }).success).toBe(
        false,
      );
      expect(HostInvitationUpdateSchema.safeParse({ gateStyle: "curtain" }).success).toBe(false);
      expect(
        HostInvitationUpdateSchema.safeParse({ expectedUpdatedAt: "2026-11-12T10:30" }).success,
      ).toBe(false);
      expect(
        HostInvitationUpdateSchema.safeParse({ content: { ...minimalContent, headline: "" } })
          .success,
      ).toBe(false);
    });

    it("HostInvitationSchema, HostEventSummarySchema, HostEventDetailSchema and the list parse real shapes", () => {
      expect(HostInvitationSchema.safeParse(invitation).success).toBe(true);
      expect(
        HostInvitationSchema.safeParse({ ...invitation, salt: "x", id: "inv_1" }).success,
      ).toBe(false);
      expect(HostEventSummarySchema.safeParse(summary).success).toBe(true);
      expect(HostEventSummarySchema.safeParse({ ...summary, role: "ADMIN" }).success).toBe(false);
      expect(
        HostEventSummarySchema.safeParse({ ...summary, startsAtLocal: summary.startsAt }).success,
      ).toBe(false);
      expect(HostEventDetailSchema.safeParse(detail).success).toBe(true);
      expect(PublishResultSchema.safeParse(detail).success).toBe(true);
      expect(HostEventDetailSchema.safeParse(summary).success).toBe(false);
      expect(HostEventListSchema.safeParse({ items: [summary] }).success).toBe(true);
      expect(HostEventListSchema.safeParse({ items: [{ id: "evt_1" }] }).success).toBe(false);

      // The salt is never part of a DTO: unknown keys are stripped on parse.
      const stripped = HostInvitationSchema.parse({ ...invitation, salt: "deadbeef" });
      expect(stripped).not.toHaveProperty("salt");
    });

    it("PublishRequirementEnum lists the publish blockers", () => {
      expect(PublishRequirementEnum.options).toEqual([
        "HEADLINE",
        "HOSTS",
        "VENUE",
        "START_IN_FUTURE",
      ]);
    });
  });

  describe("plan and checkout", () => {
    it("PlanEntitlementsSchema mirrors the plan table without the retired bilingual flag", () => {
      expect(PlanEntitlementsSchema.safeParse(entitlements).success).toBe(true);
      expect(
        PlanEntitlementsSchema.safeParse({ ...entitlements, maxGuests: "unlimited" }).success,
      ).toBe(true);
      expect(PlanEntitlementsSchema.safeParse({ ...entitlements, maxGuests: "lots" }).success).toBe(
        false,
      );
      const { rsvpReminders: _omitted, ...withoutReminders } = entitlements;
      expect(PlanEntitlementsSchema.safeParse(withoutReminders).success).toBe(false);
      expect(
        PlanEntitlementsSchema.parse({ ...entitlements, bilingualEnFa: true }),
      ).not.toHaveProperty("bilingualEnFa");
    });

    it("PlanViewSchema validates usage and upgrade state", () => {
      const view = {
        plan: "FREE",
        effectivePlan: "FREE",
        experienceMode: "CELEBRATION",
        memorialComplimentary: false,
        entitlements,
        usage: { guests: 12, guestLimit: 30, emailsSent: 0, emailLimit: 50 },
        upgrade: {
          available: false,
          unavailableReason: "PAYMENTS_NOT_CONFIGURED",
          priceIncGstCents: 6900,
          gstCents: 627,
          currency: "AUD",
        },
      };
      expect(PlanViewSchema.safeParse(view).success).toBe(true);
      expect(
        PlanViewSchema.safeParse({
          ...view,
          usage: { guests: 12, guestLimit: null, emailsSent: 0, emailLimit: null },
          upgrade: { ...view.upgrade, available: true, unavailableReason: null },
        }).success,
      ).toBe(true);
      expect(
        PlanViewSchema.safeParse({ ...view, upgrade: { ...view.upgrade, priceIncGstCents: 69.0 } })
          .success,
      ).toBe(true);
      expect(
        PlanViewSchema.safeParse({ ...view, upgrade: { ...view.upgrade, priceIncGstCents: 69.5 } })
          .success,
      ).toBe(false);
      expect(
        PlanViewSchema.safeParse({ ...view, upgrade: { ...view.upgrade, currency: "USD" } })
          .success,
      ).toBe(false);
      expect(
        PlanViewSchema.safeParse({
          ...view,
          upgrade: { ...view.upgrade, unavailableReason: "SOLD_OUT" },
        }).success,
      ).toBe(false);
    });

    it("checkout schemas validate their payloads", () => {
      expect(CheckoutCreateSchema.parse({})).toEqual({});
      expect(
        CheckoutSessionSchema.safeParse({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" })
          .success,
      ).toBe(true);
      expect(
        CheckoutSessionSchema.safeParse({ checkoutUrl: "http://checkout.stripe.com/c" }).success,
      ).toBe(false);
      expect(CheckoutConfirmSchema.safeParse({ sessionId: "cs_test_a1b2c3" }).success).toBe(true);
      expect(CheckoutConfirmSchema.safeParse({ sessionId: "short" }).success).toBe(false);
      expect(CheckoutConfirmSchema.safeParse({ sessionId: "x".repeat(201) }).success).toBe(false);
    });
  });
});
