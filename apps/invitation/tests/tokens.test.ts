import { describe, it, expect } from "vitest";
import {
  generateGuestToken,
  generateEventSalt,
  generateEventSlug,
  isValidGuestTokenFormat,
  SAFE_TOKEN_ALPHABET,
} from "../lib/tokens";

describe("Guest Token and Slug derivation", () => {
  const pepper = "managevent-test-pepper-xyz";
  const salt = "salt-test-event-123";

  it("generates deterministic tokens for identical inputs", () => {
    const token1 = generateGuestToken("Armita & Hesam", pepper, salt, "party_1");
    const token2 = generateGuestToken("Armita & Hesam", pepper, salt, "party_1");
    expect(token1).toBe(token2);
  });

  it("generates distinct tokens for different party IDs or salts", () => {
    const token1 = generateGuestToken("Armita & Hesam", pepper, salt, "party_1");
    const token2 = generateGuestToken("Armita & Hesam", pepper, salt, "party_2");
    expect(token1).not.toBe(token2);
  });

  it("uses only characters from SAFE_TOKEN_ALPHABET in suffix", () => {
    const token = generateGuestToken("Dr. Sarah Jenkins", pepper, salt, "party_3");
    const suffix = token.split("-").pop() || "";
    const safeRegex = new RegExp(`^[${SAFE_TOKEN_ALPHABET}]+$`);
    expect(safeRegex.test(suffix)).toBe(true);
  });

  it("validates token formats correctly", () => {
    expect(isValidGuestTokenFormat("armita-party-g9qtmt")).toBe(true);
    expect(isValidGuestTokenFormat("sample-token-234567")).toBe(true);
    // Invalid characters (uppercase, spaces, punctuation, or too short suffix)
    expect(isValidGuestTokenFormat("Invalid Token!")).toBe(false);
    expect(isValidGuestTokenFormat("sample-token-abc")).toBe(false);
    expect(isValidGuestTokenFormat("")).toBe(false);
  });

  it("generates URL-safe event slugs", () => {
    const slug1 = generateEventSlug("Niloofar & Sadra — 10th Anniversary", "salt123");
    expect(slug1).toMatch(/^niloofar-sadra-10th-anniversary-[a-z0-9]+$/);

    const slug2 = generateEventSlug("سفره عقد رویا و کیان", "salt456");
    expect(slug2.length).toBeGreaterThan(0);
  });

  it("generates unique cryptographically secure salts", () => {
    const s1 = generateEventSalt();
    const s2 = generateEventSalt();
    expect(s1).not.toBe(s2);
    expect(s1.length).toBeGreaterThanOrEqual(16);
  });
});
