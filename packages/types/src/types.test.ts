import { describe, expect, it } from "vitest";
import {
  asBrandedId,
  type EventId,
  isAudCents,
  isBrandedId,
  type LeadCreate,
  type UserId,
} from "./index.js";

const SAMPLE_UUID_V7 = "0192b400-0000-7000-8000-000000000001";

describe("@managevent/types", () => {
  it("validates and narrows branded prefixed UUIDv7 IDs", () => {
    const rawEventId = `evt_${SAMPLE_UUID_V7}`;
    expect(isBrandedId(rawEventId, "evt_")).toBe(true);
    expect(isBrandedId(rawEventId, "usr_")).toBe(false);
    expect(isBrandedId("evt_invalid", "evt_")).toBe(false);

    const brandedEventId: EventId = asBrandedId(rawEventId, "evt_");
    expect(brandedEventId).toBe(rawEventId);

    const rawUserId = `usr_${SAMPLE_UUID_V7}`;
    const brandedUserId: UserId = asBrandedId(rawUserId, "usr_");
    expect(brandedUserId).toBe(rawUserId);

    expect(() => asBrandedId(rawEventId, "usr_")).toThrow(TypeError);
  });

  it("validates AudCents type guard and inferred domain types", () => {
    expect(isAudCents(50000)).toBe(true);
    expect(isAudCents(0)).toBe(true);
    expect(isAudCents(-10)).toBe(false);
    expect(isAudCents(12.34)).toBe(false);

    const sampleLead: LeadCreate = {
      source: "BUILDER",
      name: "Sara",
      email: "sara@example.com",
      preferredLanguage: "en",
      preferredChannel: "EMAIL",
      dateFlexible: false,
      marketingConsent: false,
    };
    expect(sampleLead.source).toBe("BUILDER");
  });
});
