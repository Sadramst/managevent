import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUnsubscribeToken,
  hashEmailAddress,
  verifyUnsubscribeToken,
} from "./unsubscribe-token.js";

/**
 * The same vector is asserted in `apps/worker/src/lib/unsubscribe-token.test.ts`: the worker signs
 * the token and the API verifies it, so the two helpers must stay byte-for-byte compatible.
 */
const PEPPER = "unit-test-pepper-0123456789abcdef-unit";
const ADDRESS_HASH = "b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72";
const TOKEN =
  "tfyF5VdV-eDQMKEKtEKbaylEhV-aDWAHf-gyvsvEHXI.2od9HGl0JGWRdhdaSxibdDt1rfvTKxxi86lQjtllvo8";

describe("unsubscribe token", () => {
  beforeEach(() => {
    vi.stubEnv("GUEST_TOKEN_PEPPER", PEPPER);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hashes an address after trimming and lowercasing it", () => {
    expect(hashEmailAddress("ada@example.com")).toBe(ADDRESS_HASH);
    expect(hashEmailAddress("  Ada@Example.COM ")).toBe(ADDRESS_HASH);
    expect(hashEmailAddress("byron@example.com")).not.toBe(ADDRESS_HASH);
  });

  it("matches the shared test vector", () => {
    expect(createUnsubscribeToken(ADDRESS_HASH)).toBe(TOKEN);
    expect(verifyUnsubscribeToken(TOKEN)).toBe(ADDRESS_HASH);
  });

  it("carries only the hash, never the address", () => {
    const [hashPart] = TOKEN.split(".");
    expect(Buffer.from(hashPart ?? "", "base64url").toString("hex")).toBe(ADDRESS_HASH);
    expect(TOKEN).not.toContain("ada");
    expect(TOKEN.length).toBeGreaterThanOrEqual(20);
    expect(TOKEN.length).toBeLessThanOrEqual(400);
  });

  it("rejects forged, truncated and malformed tokens", () => {
    const [hashPart = "", signature = ""] = TOKEN.split(".");
    const otherHash = Buffer.from(hashEmailAddress("byron@example.com"), "hex").toString(
      "base64url",
    );
    for (const forged of [
      `${otherHash}.${signature}`, // a valid signature for a different address
      `${hashPart}.${signature.slice(0, -2)}AA`,
      `${hashPart}.`,
      `.${signature}`,
      hashPart,
      `${hashPart}.${signature}.extra`,
      "not a token at all",
      "",
    ]) {
      expect(verifyUnsubscribeToken(forged), forged).toBeNull();
    }
  });

  it("is bound to the pepper", () => {
    vi.stubEnv("GUEST_TOKEN_PEPPER", "another-pepper-0123456789abcdef-another");
    expect(verifyUnsubscribeToken(TOKEN)).toBeNull();
    expect(createUnsubscribeToken(ADDRESS_HASH)).not.toBe(TOKEN);
  });

  it("refuses to sign anything that is not a sha256 digest", () => {
    expect(() => createUnsubscribeToken("ada@example.com")).toThrow(RangeError);
  });
});
