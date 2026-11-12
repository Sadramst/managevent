import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUnsubscribeToken,
  getGuestTokenPepper,
  hashEmailAddress,
  verifyUnsubscribeToken,
} from "./unsubscribe-token.js";

/**
 * The same vector is asserted in `apps/api/src/modules/messaging/unsubscribe-token.test.ts`: the
 * worker signs the token and the API verifies it, so the two helpers must stay byte-for-byte
 * compatible.
 */
const PEPPER = "unit-test-pepper-0123456789abcdef-unit";
const ADDRESS_HASH = "b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72";
const TOKEN =
  "tfyF5VdV-eDQMKEKtEKbaylEhV-aDWAHf-gyvsvEHXI.2od9HGl0JGWRdhdaSxibdDt1rfvTKxxi86lQjtllvo8";

describe("unsubscribe token (worker side)", () => {
  beforeEach(() => {
    vi.stubEnv("GUEST_TOKEN_PEPPER", PEPPER);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches the vector shared with the API", () => {
    expect(hashEmailAddress("  Ada@Example.COM ")).toBe(ADDRESS_HASH);
    expect(createUnsubscribeToken(ADDRESS_HASH)).toBe(TOKEN);
    expect(verifyUnsubscribeToken(TOKEN)).toBe(ADDRESS_HASH);
  });

  it("rejects a token signed for another address or with another pepper", () => {
    const [, signature = ""] = TOKEN.split(".");
    const otherHash = Buffer.from(hashEmailAddress("byron@example.com"), "hex").toString(
      "base64url",
    );
    expect(verifyUnsubscribeToken(`${otherHash}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken("garbage")).toBeNull();

    vi.stubEnv("GUEST_TOKEN_PEPPER", "another-pepper-0123456789abcdef-another");
    expect(verifyUnsubscribeToken(TOKEN)).toBeNull();
  });

  it("requires a real pepper in production and falls back only in development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GUEST_TOKEN_PEPPER", "too-short");
    expect(() => getGuestTokenPepper()).toThrow("GUEST_TOKEN_PEPPER");
    vi.stubEnv("GUEST_TOKEN_PEPPER", PEPPER);
    expect(getGuestTokenPepper()).toBe(PEPPER);

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("GUEST_TOKEN_PEPPER", "");
    // Same development fallback as the API, so local links verify across both apps.
    expect(getGuestTokenPepper()).toBe("managevent-local-dev-pepper-default-salt");
  });
});
