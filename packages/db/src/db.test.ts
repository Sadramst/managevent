import { describe, expect, it } from "vitest";
import {
  createDbClient,
  decryptField,
  decryptRsvpRecord,
  encryptField,
  ENCRYPTION_PREFIX,
  encryptRsvpWriteData,
  extractIdTimestamp,
  generateId,
  generateUuidV7,
  ID_PREFIXES,
  isEncryptedValue,
  isValidPrefixedId,
  loadContentSeedFixtures,
  PrismaClient,
  seedDatabase,
} from "./index.js";

describe("@managevent/db", () => {
  describe("Prefixed UUIDv7 ID generator", () => {
    it("generates valid RFC 9562 UUIDv7 strings and prefixed IDs for all entity types", () => {
      const uuid = generateUuidV7();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      for (const [key, prefix] of Object.entries(ID_PREFIXES)) {
        const idByPrefix = generateId(prefix);
        const idByKey = generateId(key as keyof typeof ID_PREFIXES);
        expect(isValidPrefixedId(idByPrefix, prefix)).toBe(true);
        expect(isValidPrefixedId(idByKey, prefix)).toBe(true);
      }
    });

    it("maintains strict lexicographical sortability across and within the same millisecond", () => {
      const fixedMs = 1792713600000;
      const ids = Array.from({ length: 20 }, () => generateId("evt_", fixedMs));
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);

      const extracted = extractIdTimestamp(ids[0] ?? "");
      expect(extracted?.getTime()).toBe(fixedMs);
    });

    it("rejects malformed or mismatched prefixes", () => {
      const evtId = generateId("evt_");
      expect(isValidPrefixedId(evtId, "usr_")).toBe(false);
      expect(isValidPrefixedId("evt_not-a-uuid")).toBe(false);
      expect(extractIdTimestamp("invalid")).toBeNull();
    });
  });

  describe("AES-256-GCM field encryption", () => {
    const testKey = Buffer.alloc(32, 7).toString("base64");

    it("encrypts and decrypts UTF-8 strings including Farsi text", () => {
      const plaintext = "Severe peanut anaphylaxis – حساسیت شدید به بادام زمینی";
      const encrypted = encryptField(plaintext, testKey);
      expect(encrypted.startsWith(ENCRYPTION_PREFIX)).toBe(true);
      expect(isEncryptedValue(encrypted)).toBe(true);
      expect(encrypted).not.toContain("peanut");

      // Idempotent if called twice
      expect(encryptField(encrypted, testKey)).toBe(encrypted);

      const decrypted = decryptField(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it("throws on tampered authentication tag or ciphertext", () => {
      const encrypted = encryptField("Dietary allergy detail", testKey);
      const tampered = `${encrypted.slice(0, -4)}ffff`;
      expect(() => decryptField(tampered, testKey)).toThrow();
    });

    it("encrypts and decrypts RSVP sensitive write/read records", () => {
      const rsvpWrite = encryptRsvpWriteData(
        {
          guestId: generateId("gst_"),
          dietary: ["HALAL", "NUT_ALLERGY"],
          allergyNotes: "EpiPen carried",
          allergySeverity: "SEVERE_ANAPHYLAXIS",
          accessibilityNotes: "Step-free access needed",
        },
        testKey,
      );

      expect(isEncryptedValue(rsvpWrite.allergyNotes)).toBe(true);
      expect(isEncryptedValue(rsvpWrite.accessibilityNotes)).toBe(true);
      expect(isEncryptedValue((rsvpWrite as Record<string, unknown>).dietaryEncrypted)).toBe(true);
      expect(
        isEncryptedValue((rsvpWrite as Record<string, unknown>).allergySeverityEncrypted),
      ).toBe(true);

      const decrypted = decryptRsvpRecord(rsvpWrite, testKey);
      expect(decrypted.allergyNotes).toBe("EpiPen carried");
      expect(decrypted.accessibilityNotes).toBe("Step-free access needed");
      expect(decrypted.dietary).toEqual(["HALAL", "NUT_ALLERGY"]);
      expect(decrypted.allergySeverity).toBe("SEVERE_ANAPHYLAXIS");
    });
  });

  describe("Perth placeholder seed & database integration", () => {
    it("loads ceremonies, packages and Perth venues from /content", () => {
      const fixtures = loadContentSeedFixtures();
      expect(fixtures.ceremonies.length).toBeGreaterThanOrEqual(3);
      expect(fixtures.packages.length).toBeGreaterThanOrEqual(3);
      expect(fixtures.venues.length).toBeGreaterThanOrEqual(8);
    });

    it("seeds the Postgres database and round-trips encrypted RSVP records", async () => {
      const rawClient = new PrismaClient();
      const extendedClient = createDbClient();

      try {
        const summary = await seedDatabase(rawClient);
        expect(summary.ceremoniesCount).toBeGreaterThanOrEqual(3);
        expect(summary.venuesCount).toBeGreaterThanOrEqual(8);
        expect(summary.packagesCount).toBeGreaterThanOrEqual(3);

        // Verify round-trip of encrypted RSVP via the Prisma extension
        const userId = generateId("usr_");
        const eventId = generateId("evt_");
        const invId = generateId("inv_");
        const partyId = generateId("pty_");
        const guestId = generateId("gst_");
        const rsvpId = generateId("rsvp_");

        await extendedClient.user.create({
          data: {
            id: userId,
            email: `host-${userId}@example.com`,
            name: "Test Host",
            roles: ["CUSTOMER_HOST"],
          },
        });

        await extendedClient.event.create({
          data: {
            id: eventId,
            ownerUserId: userId,
            title: { en: "Test Aghd" },
            ceremonySlug: "sofreh-aghd",
            experienceMode: "CELEBRATION",
            startsAt: new Date("2026-12-01T08:00:00.000Z"),
          },
        });

        await extendedClient.invitation.create({
          data: {
            id: invId,
            eventId,
            eventSlug: `slug-${invId}`,
            templateSlug: "classic-arch",
            themeId: "royal-ivory",
            contentJson: {},
            languages: ["en", "fa"],
            gateStyle: "arch",
            rsvpConfigJson: {},
            salt: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
            wellConfigJson: {},
          },
        });

        await extendedClient.party.create({
          data: {
            id: partyId,
            invitationId: invId,
            stableId: "party-stable-1",
            displayName: { en: "Test Family" },
            token: `token-${partyId}`,
            tags: [],
          },
        });

        await extendedClient.guest.create({
          data: {
            id: guestId,
            partyId,
            stableId: "guest-stable-1",
            name: { en: "Test Guest" },
          },
        });

        const createdRsvp = await extendedClient.rsvp.create({
          data: {
            id: rsvpId,
            guestId,
            status: "YES",
            respondedAt: new Date(),
            dietary: ["HALAL", "NUT_ALLERGY"],
            allergyNotes: "Strict nut-free preparation",
            allergySeverity: "SEVERE_ANAPHYLAXIS",
            accessibilityNotes: "Wheelchair ramp",
            songRequests: [],
            idempotencyKey: `idem-${rsvpId}`,
          },
        });

        expect(createdRsvp.allergyNotes).toBe("Strict nut-free preparation");
        expect(createdRsvp.accessibilityNotes).toBe("Wheelchair ramp");

        // Verify raw row in DB has encrypted ciphertext
        const rawRow = await rawClient.rsvp.findUnique({ where: { id: rsvpId } });
        expect(isEncryptedValue(rawRow?.allergyNotes)).toBe(true);
        expect(isEncryptedValue(rawRow?.accessibilityNotes)).toBe(true);
        expect(isEncryptedValue(rawRow?.dietaryEncrypted)).toBe(true);

        // Cleanup test entities
        await extendedClient.event.delete({ where: { id: eventId } });
        await extendedClient.user.delete({ where: { id: userId } });
      } finally {
        await rawClient.$disconnect();
      }
    });
  });
});
