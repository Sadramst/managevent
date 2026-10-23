import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DietaryCountsSchema,
  AbnSchema,
  ApiErrorSchema,
  AuPhoneSchema,
  BuilderEstimateRequestSchema,
  BuilderEstimateResponseSchema,
  BuilderSessionSaveSchema,
  CentsSchema,
  ContentCeremonySchema,
  ContentCitySchema,
  ContentPackageSchema,
  ContentRoutesSchema,
  ContentTestimonialsSchema,
  ContentVenuesSchema,
  EventCreateSchema,
  EventResponseSchema,
  EventUpdateSchema,
  GuestCreateSchema,
  GuestResponseSchema,
  GuestTokenSchema,
  HealthResponseSchema,
  IanaTimeZoneSchema,
  InvitationCreateSchema,
  InvitationResponseSchema,
  InvitationUpdateSchema,
  LeadCreateSchema,
  LeadResponseSchema,
  LocaleSchema,
  LocalizedTextSchema,
  OrderApplyRecommendationSchema,
  OrderCreateSchema,
  OrderLineSchema,
  OrderResponseSchema,
  PartyCreateSchema,
  PartyResponseSchema,
  PassResponseSchema,
  PaymentCreateSchema,
  PaymentResponseSchema,
  RecommendationItemSchema,
  RecommendationSetResponseSchema,
  RsvpResponseSchema,
  RsvpSubmitSchema,
  SafeEventSlugSchema,
  ScanEventCreateSchema,
  ScanEventResponseSchema,
  SlugSchema,
  TaxInvoiceSchema,
  UserIdSchema,
} from "./index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(currentDir, "../../../content");

const SAMPLE_UUID_V7 = "0192b400-0000-7000-8000-000000000001";

describe("@managevent/validators", () => {
  it("accepts dietary counts only and rejects personal information or negative counts", () => {
    expect(DietaryCountsSchema.safeParse({ HALAL: 2, NUT_ALLERGY: 1 }).success).toBe(true);
    expect(DietaryCountsSchema.safeParse({ HALAL: -1 }).success).toBe(false);
    expect(DietaryCountsSchema.safeParse({ HALAL: 1, name: "Guest" }).success).toBe(false);
    expect(DietaryCountsSchema.safeParse({ NUT_ALLERGY: ["Guest"] }).success).toBe(false);
  });
  describe("Primitives (valid and invalid fixtures)", () => {
    it("CentsSchema validates non-negative integers and rejects floats/negatives", () => {
      expect(CentsSchema.safeParse(15000).success).toBe(true);
      expect(CentsSchema.safeParse(0).success).toBe(true);
      expect(CentsSchema.safeParse(15.5).success).toBe(false);
      expect(CentsSchema.safeParse(-100).success).toBe(false);
    });

    it("AuPhoneSchema validates Australian mobile/landline numbers and rejects invalid formats", () => {
      expect(AuPhoneSchema.safeParse("+61 412 345 678").success).toBe(true);
      expect(AuPhoneSchema.safeParse("0412-345-678").success).toBe(true);
      expect(AuPhoneSchema.safeParse("08 9123 4567").success).toBe(true);
      expect(AuPhoneSchema.safeParse("+1 555 123 4567").success).toBe(false);
      expect(AuPhoneSchema.safeParse("12345").success).toBe(false);
    });

    it("AbnSchema validates 11-digit ATO modulus-89 checksum and rejects invalid ABNs", () => {
      // 51 824 753 556 is ATO's official example valid ABN
      expect(AbnSchema.safeParse("51 824 753 556").success).toBe(true);
      expect(AbnSchema.safeParse("51824753556").success).toBe(true);
      expect(AbnSchema.safeParse("51824753557").success).toBe(false);
      expect(AbnSchema.safeParse("1234567890").success).toBe(false);
    });

    it("IanaTimeZoneSchema validates IANA time zones and rejects invalid strings", () => {
      expect(IanaTimeZoneSchema.safeParse("Australia/Perth").success).toBe(true);
      expect(IanaTimeZoneSchema.safeParse("Australia/Sydney").success).toBe(true);
      expect(IanaTimeZoneSchema.safeParse("Not/A_Timezone").success).toBe(false);
      expect(IanaTimeZoneSchema.safeParse("+08:00").success).toBe(false);
    });

    it("LocaleSchema, SlugSchema, SafeEventSlugSchema, GuestTokenSchema, and PrefixedIdSchema", () => {
      expect(LocaleSchema.safeParse("en").success).toBe(true);
      expect(LocaleSchema.safeParse("fa").success).toBe(true);
      expect(LocaleSchema.safeParse("de").success).toBe(false);

      expect(SlugSchema.safeParse("sofreh-aghd").success).toBe(true);
      expect(SlugSchema.safeParse("Invalid Slug!").success).toBe(false);

      // SafeEventSlugSchema forbids 0, 1, i, l, o
      expect(SafeEventSlugSchema.safeParse("sara-aghd-7kq").success).toBe(true);
      expect(SafeEventSlugSchema.safeParse("sara-ali-10").success).toBe(false);

      expect(GuestTokenSchema.safeParse("sara-family-g9qtmt").success).toBe(true);
      expect(GuestTokenSchema.safeParse("sara-family-01iloo").success).toBe(false);

      expect(UserIdSchema.safeParse(`usr_${SAMPLE_UUID_V7}`).success).toBe(true);
      expect(UserIdSchema.safeParse(`evt_${SAMPLE_UUID_V7}`).success).toBe(false);
    });
  });

  describe("Content schemas (mirroring content/schemas and validating /content files)", () => {
    it("validates LocalizedTextSchema (valid and invalid)", () => {
      expect(LocalizedTextSchema.safeParse({ en: "Weddings", fa: "عروسی" }).success).toBe(true);
      expect(LocalizedTextSchema.safeParse({ fa: "عروسی" }).success).toBe(false);
      expect(LocalizedTextSchema.safeParse({ en: "", fa: "عروسی" }).success).toBe(false);
    });

    it("validates all /content JSON files against Content* schemas and rejects invalid fixtures", () => {
      const ceremonyFiles = readdirSync(resolve(contentRoot, "ceremonies")).filter((f) =>
        f.endsWith(".json"),
      );
      for (const file of ceremonyFiles) {
        const data: unknown = JSON.parse(
          readFileSync(resolve(contentRoot, "ceremonies", file), "utf8"),
        );
        expect(ContentCeremonySchema.safeParse(data).success).toBe(true);
      }
      expect(ContentCeremonySchema.safeParse({ slug: "BAD" }).success).toBe(false);

      const cityDirs = readdirSync(resolve(contentRoot, "locations"));
      for (const city of cityDirs) {
        const data: unknown = JSON.parse(
          readFileSync(resolve(contentRoot, "locations", city, "city.json"), "utf8"),
        );
        expect(ContentCitySchema.safeParse(data).success).toBe(true);
      }
      expect(ContentCitySchema.safeParse({ slug: "perth", status: "invalid" }).success).toBe(false);

      const pkgFiles = readdirSync(resolve(contentRoot, "packages")).filter((f) =>
        f.endsWith(".json"),
      );
      for (const file of pkgFiles) {
        const data: unknown = JSON.parse(
          readFileSync(resolve(contentRoot, "packages", file), "utf8"),
        );
        expect(ContentPackageSchema.safeParse(data).success).toBe(true);
      }
      // guestMax < guestMin should fail
      expect(
        ContentPackageSchema.safeParse({
          slug: "bad-pkg",
          status: "draft",
          name: { en: "Bad" },
          ceremonySlugs: ["wedding"],
          guestMin: 100,
          guestMax: 50,
          fromPriceIncGstCents: 10000,
          inclusions: [{ category: "styling", label: { en: "Styling" } }],
        }).success,
      ).toBe(false);

      const routesData: unknown = JSON.parse(
        readFileSync(resolve(contentRoot, "routes.json"), "utf8"),
      );
      expect(ContentRoutesSchema.safeParse(routesData).success).toBe(true);
      expect(ContentRoutesSchema.safeParse({ aliases: [{}] }).success).toBe(false);

      const venuesData: unknown = JSON.parse(
        readFileSync(resolve(contentRoot, "locations/perth/venues.json"), "utf8"),
      );
      expect(ContentVenuesSchema.safeParse(venuesData).success).toBe(true);
      expect(ContentVenuesSchema.safeParse([{ slug: "bad" }]).success).toBe(false);

      const testimonialsData: unknown = JSON.parse(
        readFileSync(resolve(contentRoot, "testimonials/testimonials.json"), "utf8"),
      );
      expect(ContentTestimonialsSchema.safeParse(testimonialsData).success).toBe(true);
      // Unverified testimonial must be rejected (ACL)
      expect(
        ContentTestimonialsSchema.safeParse([
          {
            id: "1",
            verified: false,
            consentRecordId: `cns_${SAMPLE_UUID_V7}`,
            quote: { en: "Great" },
            author: "Sara, Subiaco",
            ceremonySlug: "wedding",
            date: "2026-10-01",
          },
        ]).success,
      ).toBe(false);
    });
  });

  describe("MVP API Input & Output Schemas (valid and invalid fixtures per schema)", () => {
    it("ApiErrorSchema and HealthResponseSchema", () => {
      expect(
        ApiErrorSchema.safeParse({
          error: { code: "NOT_FOUND", message: "Resource not found", requestId: "req_123" },
        }).success,
      ).toBe(true);
      expect(ApiErrorSchema.safeParse({ error: { code: "" } }).success).toBe(false);

      expect(
        HealthResponseSchema.safeParse({
          status: "ok",
          service: "managevent-api",
          region: "syd",
          timestamp: "2026-10-23T04:00:00.000Z",
        }).success,
      ).toBe(true);
      expect(HealthResponseSchema.safeParse({ status: "down" }).success).toBe(false);
    });

    it("LeadCreateSchema and LeadResponseSchema", () => {
      expect(
        LeadCreateSchema.safeParse({
          source: "BUILDER",
          name: "Sara Ahmadi",
          email: "sara@example.com",
          phone: "+61412345678",
          preferredLanguage: "fa",
          preferredChannel: "WHATSAPP",
          ceremonySlug: "sofreh-aghd",
          guestEstimate: 80,
          marketingConsent: false,
        }).success,
      ).toBe(true);

      // Non-empty honeypot websiteUrl must fail
      expect(
        LeadCreateSchema.safeParse({
          source: "CONTACT_FORM",
          name: "Bot",
          email: "bot@example.com",
          websiteUrl: "https://spam.example",
        }).success,
      ).toBe(false);

      expect(
        LeadResponseSchema.safeParse({
          id: `lead_${SAMPLE_UUID_V7}`,
          stage: "NEW",
          source: "BUILDER",
          name: "Sara Ahmadi",
          email: "sara@example.com",
          phone: "+61412345678",
          preferredLanguage: "fa",
          preferredChannel: "WHATSAPP",
          ceremonySlug: "sofreh-aghd",
          eventDate: null,
          dateFlexible: true,
          guestEstimate: 80,
          area: "Swan Valley",
          estimateId: null,
          marketingConsentId: null,
          createdAt: "2026-10-23T04:00:00.000Z",
        }).success,
      ).toBe(true);
      expect(LeadResponseSchema.safeParse({ id: "bad" }).success).toBe(false);
    });

    it("BuilderEstimateRequestSchema, BuilderEstimateResponseSchema, and BuilderSessionSaveSchema", () => {
      const validReq = {
        ceremonySlug: "sofreh-aghd",
        adults: 80,
        children: 10,
        venueType: "WINERY" as const,
        travelZone: "METRO" as const,
        durationHours: 6,
        services: [{ category: "catering" as const, tier: "SIGNATURE" as const }],
        extras: ["photo-wall" as const],
        locale: "fa" as const,
      };
      expect(BuilderEstimateRequestSchema.safeParse(validReq).success).toBe(true);
      expect(
        BuilderEstimateRequestSchema.safeParse({ ...validReq, adults: 0, services: [] }).success,
      ).toBe(false);

      expect(
        BuilderSessionSaveSchema.safeParse({
          anonymousKey: "anon-key-12345",
          locale: "en",
          ceremonySlug: "sofreh-aghd",
          state: validReq,
        }).success,
      ).toBe(true);
      expect(BuilderSessionSaveSchema.safeParse({ anonymousKey: "short" }).success).toBe(false);

      expect(
        BuilderEstimateResponseSchema.safeParse({
          priceListVersion: "2026.10.1",
          currency: "AUD",
          experienceMode: "CELEBRATION",
          quoteOnlyRegional: false,
          lowIncGstCents: 1200000,
          highIncGstCents: 1500000,
          lowGstCents: 109091,
          highGstCents: 136364,
          depositPreviewIncGstCents: 300000,
          breakdown: [
            {
              category: "catering",
              tier: "SIGNATURE",
              driver: "GUEST",
              quantity: 90,
              baseIncGstCents: 1350000,
              lowIncGstCents: 1200000,
              highIncGstCents: 1500000,
              lowExGstCents: 1090909,
              lowGstCents: 109091,
              highExGstCents: 1363636,
              highGstCents: 136364,
            },
          ],
          assumptions: ["Includes 10% GST"],
          disclaimerKey: "builder.estimate.disclaimer",
        }).success,
      ).toBe(true);
      expect(BuilderEstimateResponseSchema.safeParse({ currency: "USD" }).success).toBe(false);
    });

    it("EventCreateSchema, EventUpdateSchema, and EventResponseSchema", () => {
      expect(
        EventCreateSchema.safeParse({
          title: { en: "Sara & Ali Aghd", fa: "عقد سارا و علی" },
          ceremonySlug: "sofreh-aghd",
          startsAt: "2026-12-15T08:00:00.000Z",
          timeZone: "Australia/Perth",
        }).success,
      ).toBe(true);
      expect(EventCreateSchema.safeParse({ title: {}, startsAt: "bad" }).success).toBe(false);

      expect(EventUpdateSchema.safeParse({ status: "BOOKED" }).success).toBe(true);
      expect(EventUpdateSchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);

      expect(
        EventResponseSchema.safeParse({
          id: `evt_${SAMPLE_UUID_V7}`,
          ownerUserId: `usr_${SAMPLE_UUID_V7}`,
          title: { en: "Sara & Ali Aghd" },
          ceremonySlug: "sofreh-aghd",
          experienceMode: "CELEBRATION",
          status: "PLANNING",
          startsAt: "2026-12-15T08:00:00.000Z",
          endsAt: null,
          timeZone: "Australia/Perth",
          venueId: null,
          venueFreeText: "Swan Valley",
          guestCountTarget: 100,
          isAgencyManaged: true,
          createdAt: "2026-10-23T04:00:00.000Z",
          updatedAt: "2026-10-23T04:00:00.000Z",
        }).success,
      ).toBe(true);
      expect(EventResponseSchema.safeParse({ id: "invalid" }).success).toBe(false);
    });

    it("InvitationCreateSchema enforces theme/mode compatibility and Memorial Mode rules", () => {
      // Valid celebration invitation
      expect(
        InvitationCreateSchema.safeParse({
          eventId: `evt_${SAMPLE_UUID_V7}`,
          experienceMode: "CELEBRATION",
          eventSlug: "sara-aghd-7kq",
          templateSlug: "classic-arch",
          themeId: "persian-azure",
          languages: ["en", "fa"],
          defaultLanguage: "fa",
          gateStyle: "arch",
        }).success,
      ).toBe(true);

      // Invalid: Memorial event with celebration theme or wax-seal or wallAutoApprove
      const invalidMemorial = InvitationCreateSchema.safeParse({
        eventId: `evt_${SAMPLE_UUID_V7}`,
        experienceMode: "MEMORIAL",
        eventSlug: "mem-service-7kq",
        templateSlug: "calm-tribute",
        themeId: "royal-ivory",
        languages: ["en"],
        gateStyle: "wax-seal",
        wallAutoApprove: true,
        wellMode: "WISHING_WELL",
      });
      expect(invalidMemorial.success).toBe(false);

      // Valid memorial invitation
      expect(
        InvitationCreateSchema.safeParse({
          eventId: `evt_${SAMPLE_UUID_V7}`,
          experienceMode: "MEMORIAL",
          eventSlug: "mem-service-7kq",
          templateSlug: "calm-tribute",
          themeId: "memorial-alabaster",
          languages: ["en"],
          gateStyle: "plain-fade",
          wallAutoApprove: false,
          wellMode: "TRIBUTE_BOOK",
        }).success,
      ).toBe(true);

      expect(InvitationUpdateSchema.safeParse({ allowForwarding: false }).success).toBe(true);
      expect(InvitationUpdateSchema.safeParse({ themeId: "unknown-theme" }).success).toBe(false);

      expect(
        InvitationResponseSchema.safeParse({
          id: `inv_${SAMPLE_UUID_V7}`,
          eventId: `evt_${SAMPLE_UUID_V7}`,
          eventSlug: "sara-aghd-7kq",
          templateSlug: "classic-arch",
          themeId: "persian-azure",
          languages: ["en", "fa"],
          defaultLanguage: "fa",
          gateStyle: "arch",
          plan: "PREMIUM",
          rsvpDeadline: null,
          publishedAt: null,
          allowForwarding: true,
          wallEnabled: true,
          wallAutoApprove: false,
          wellMode: "WISHING_WELL",
        }).success,
      ).toBe(true);
      expect(InvitationResponseSchema.safeParse({ id: "bad" }).success).toBe(false);
    });

    it("Party, Guest, RSVP, and Pass schemas", () => {
      expect(
        PartyCreateSchema.safeParse({
          invitationId: `inv_${SAMPLE_UUID_V7}`,
          displayName: { en: "Sara & Family" },
          maxSeats: 4,
        }).success,
      ).toBe(true);
      expect(PartyCreateSchema.safeParse({ maxSeats: 0 }).success).toBe(false);

      expect(
        PartyResponseSchema.safeParse({
          id: `pty_${SAMPLE_UUID_V7}`,
          invitationId: `inv_${SAMPLE_UUID_V7}`,
          stableId: "st_1",
          displayName: { en: "Sara & Family" },
          token: "sara-family-g9qtmt",
          tokenRevokedAt: null,
          maxSeats: 4,
          allowPlusOnes: false,
          childrenAllowed: true,
          tags: ["family"],
          tableLabel: "Table 1",
        }).success,
      ).toBe(true);
      expect(PartyResponseSchema.safeParse({ token: "bad" }).success).toBe(false);

      expect(
        GuestCreateSchema.safeParse({
          partyId: `pty_${SAMPLE_UUID_V7}`,
          name: { en: "Sara" },
          phone: "0412345678",
        }).success,
      ).toBe(true);
      expect(GuestCreateSchema.safeParse({ partyId: "bad" }).success).toBe(false);

      expect(
        GuestResponseSchema.safeParse({
          id: `gst_${SAMPLE_UUID_V7}`,
          partyId: `pty_${SAMPLE_UUID_V7}`,
          stableId: "gst_st_1",
          name: { en: "Sara" },
          isChild: false,
          isPlusOne: false,
        }).success,
      ).toBe(true);
      expect(GuestResponseSchema.safeParse({ id: "bad" }).success).toBe(false);

      // RSVP with dietary requires healthDataConsentGranted = true
      expect(
        RsvpSubmitSchema.safeParse({
          token: "sara-family-g9qtmt",
          idempotencyKey: "idem-key-12345",
          guests: [
            {
              guestId: `gst_${SAMPLE_UUID_V7}`,
              status: "YES",
              dietary: ["HALAL", "NUT_ALLERGY"],
              allergySeverity: "SEVERE_ANAPHYLAXIS",
              healthDataConsentGranted: true,
            },
          ],
        }).success,
      ).toBe(true);

      expect(
        RsvpSubmitSchema.safeParse({
          token: "sara-family-g9qtmt",
          idempotencyKey: "idem-key-12345",
          guests: [
            {
              guestId: `gst_${SAMPLE_UUID_V7}`,
              status: "YES",
              dietary: ["NUT_ALLERGY"],
              healthDataConsentGranted: false,
            },
          ],
        }).success,
      ).toBe(false);

      expect(
        RsvpResponseSchema.safeParse({
          rsvpIds: [`rsvp_${SAMPLE_UUID_V7}`],
          headcountSnapshotId: `hc_${SAMPLE_UUID_V7}`,
          passes: [
            {
              id: `pass_${SAMPLE_UUID_V7}`,
              guestId: `gst_${SAMPLE_UUID_V7}`,
              partyId: `pty_${SAMPLE_UUID_V7}`,
              qrPayloadSig: "signed-qr-payload-token-12345",
            },
          ],
        }).success,
      ).toBe(true);
      expect(RsvpResponseSchema.safeParse({ rsvpIds: [] }).success).toBe(false);

      expect(
        PassResponseSchema.safeParse({
          id: `pass_${SAMPLE_UUID_V7}`,
          guestId: null,
          partyId: `pty_${SAMPLE_UUID_V7}`,
          qrPayloadSig: "signed-qr-payload-token-12345",
          checkedInAt: null,
        }).success,
      ).toBe(true);
      expect(PassResponseSchema.safeParse({ id: "bad" }).success).toBe(false);

      expect(
        ScanEventCreateSchema.safeParse({
          passId: `pass_${SAMPLE_UUID_V7}`,
          eventId: `evt_${SAMPLE_UUID_V7}`,
          deviceId: "kiosk-01",
          scannedAt: "2026-12-15T08:30:00.000Z",
          clientUuid: "550e8400-e29b-41d4-a716-446655440000",
        }).success,
      ).toBe(true);
      expect(ScanEventCreateSchema.safeParse({ clientUuid: "not-uuid" }).success).toBe(false);

      expect(
        ScanEventResponseSchema.safeParse({
          id: `scn_${SAMPLE_UUID_V7}`,
          passId: `pass_${SAMPLE_UUID_V7}`,
          result: "OK",
          scannedAt: "2026-12-15T08:30:00.000Z",
        }).success,
      ).toBe(true);
      expect(ScanEventResponseSchema.safeParse({ result: "UNKNOWN" }).success).toBe(false);
    });

    it("Orders, Recommendations, Payments, and TaxInvoice schemas", () => {
      const validLine = {
        id: `oln_${SAMPLE_UUID_V7}`,
        orderId: `ord_${SAMPLE_UUID_V7}`,
        kind: "SERVICE" as const,
        refId: "catering-sig",
        description: { en: "Signature Catering" },
        qty: 100,
        unit: "GUEST" as const,
        currency: "AUD" as const,
        unitPriceExGstCents: 10000,
        amountExGstCents: 1000000,
        gstCents: 100000,
        amountIncGstCents: 1100000,
        logisticsKey: "catering.main",
      };
      expect(OrderLineSchema.safeParse(validLine).success).toBe(true);
      expect(OrderLineSchema.safeParse({ ...validLine, qty: 0 }).success).toBe(false);

      expect(
        OrderCreateSchema.safeParse({
          eventId: `evt_${SAMPLE_UUID_V7}`,
          priceListVersion: "2026.10.1",
          termsVersion: "2026.1",
          lines: [validLine],
        }).success,
      ).toBe(true);
      expect(OrderCreateSchema.safeParse({ lines: [] }).success).toBe(false);

      expect(
        OrderApplyRecommendationSchema.safeParse({
          orderId: `ord_${SAMPLE_UUID_V7}`,
          recommendationSetId: `rec_${SAMPLE_UUID_V7}`,
          idempotencyKey: "apply-rec-12345",
        }).success,
      ).toBe(true);
      expect(OrderApplyRecommendationSchema.safeParse({ orderId: "bad" }).success).toBe(false);

      expect(
        OrderResponseSchema.safeParse({
          id: `ord_${SAMPLE_UUID_V7}`,
          eventId: `evt_${SAMPLE_UUID_V7}`,
          status: "PROPOSED",
          priceListVersion: "2026.10.1",
          currency: "AUD",
          totalExGstCents: 1000000,
          totalGstCents: 100000,
          totalIncGstCents: 1100000,
          lines: [validLine],
        }).success,
      ).toBe(true);
      expect(OrderResponseSchema.safeParse({ status: "INVALID" }).success).toBe(false);

      const recItem = {
        logisticsKey: "catering.main",
        category: "catering" as const,
        currentQty: 100,
        recommendedQty: 112,
        unit: "GUEST" as const,
        reason: "105 confirmed + 5% planner buffer",
        deltaIncGstCents: 132000,
        advisoryOnlyAfterCutOff: false,
      };
      expect(RecommendationItemSchema.safeParse(recItem).success).toBe(true);
      expect(RecommendationItemSchema.safeParse({ ...recItem, currentQty: -1 }).success).toBe(
        false,
      );

      expect(
        RecommendationSetResponseSchema.safeParse({
          id: `rec_${SAMPLE_UUID_V7}`,
          eventId: `evt_${SAMPLE_UUID_V7}`,
          orderId: `ord_${SAMPLE_UUID_V7}`,
          basedOnHeadcountId: `hc_${SAMPLE_UUID_V7}`,
          rulesVersion: "1.0.0",
          status: "OPEN",
          items: [recItem],
          createdAt: "2026-10-23T04:00:00.000Z",
        }).success,
      ).toBe(true);
      expect(RecommendationSetResponseSchema.safeParse({ id: "bad" }).success).toBe(false);

      expect(
        PaymentCreateSchema.safeParse({
          orderId: `ord_${SAMPLE_UUID_V7}`,
          kind: "DEPOSIT",
          amountIncGstCents: 275000,
          method: "CARD",
          idempotencyKey: "pay-idem-12345",
        }).success,
      ).toBe(true);
      // Missing both orderId and invitationId fails
      expect(
        PaymentCreateSchema.safeParse({
          kind: "DEPOSIT",
          amountIncGstCents: 275000,
          method: "CARD",
          idempotencyKey: "pay-idem-12345",
        }).success,
      ).toBe(false);

      expect(
        PaymentResponseSchema.safeParse({
          id: `pay_${SAMPLE_UUID_V7}`,
          orderId: `ord_${SAMPLE_UUID_V7}`,
          invitationId: null,
          kind: "DEPOSIT",
          status: "SUCCEEDED",
          currency: "AUD",
          amountExGstCents: 250000,
          gstCents: 25000,
          amountIncGstCents: 275000,
          stripePaymentIntentId: "pi_test_12345",
          method: "CARD",
          paidAt: "2026-10-23T04:00:00.000Z",
        }).success,
      ).toBe(true);
      expect(PaymentResponseSchema.safeParse({ id: "bad" }).success).toBe(false);

      // TaxInvoice >= $1,000 requires customerName or customerAbn
      const baseInvoice = {
        id: `txi_${SAMPLE_UUID_V7}`,
        number: "INV-000001",
        title: "Tax invoice" as const,
        issuedAt: "2026-10-23T04:00:00.000Z",
        supplierName: "Managevent (Appilico)",
        supplierAbn: "51 824 753 556",
        currency: "AUD" as const,
        lines: [
          {
            description: "Ceremony Deposit",
            qty: 1,
            unitPriceIncGstCents: 110000,
            taxCode: "GST" as const,
            amountExGstCents: 100000,
            gstCents: 10000,
            amountIncGstCents: 110000,
          },
        ],
        totalExGstCents: 100000,
        gstCents: 10000,
        totalIncGstCents: 110000,
        pdfMediaId: `med_${SAMPLE_UUID_V7}`,
      };
      expect(
        TaxInvoiceSchema.safeParse({ ...baseInvoice, customerName: "Sara Ahmadi" }).success,
      ).toBe(true);
      expect(TaxInvoiceSchema.safeParse(baseInvoice).success).toBe(false);
    });
  });
});
