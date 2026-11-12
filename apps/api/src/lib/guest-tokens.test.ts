import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GuestTokenSchema, SAFE_TOKEN_ALPHABET, SafeEventSlugSchema } from "@managevent/validators";
import {
  buildPartyToken,
  deriveTokenSuffix,
  generateEventSalt,
  generateEventSlug,
  generateStableId,
  getGuestTokenPepper,
  isPassSignatureValid,
  signPass,
  slugifyName,
  verifyPassQr,
} from "./guest-tokens.js";

const PEPPER = "unit-test-pepper-0123456789-abcdefghij";
const SALT = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
const PASS_ID = "pass_0192b400-0000-7000-8000-000000000001";
const EVENT_ID = "evt_0192b400-0000-7000-8000-000000000002";

/** Independent reference for the suffix rule, written from the contract rather than the code. */
function referenceSuffix(pepper: string, message: string, length: number): string {
  let out = "";
  for (let block = 0; out.length < length; block += 1) {
    const digest = createHmac("sha256", pepper)
      .update(block === 0 ? message : `${message}#${block}`)
      .digest();
    for (const byte of digest) {
      if (byte >= 248) continue;
      out += SAFE_TOKEN_ALPHABET.charAt(byte % 31);
      if (out.length === length) break;
    }
  }
  return out;
}

describe("lib/guest-tokens", () => {
  const saved = { pepper: process.env.GUEST_TOKEN_PEPPER, nodeEnv: process.env.NODE_ENV };

  beforeEach(() => {
    process.env.GUEST_TOKEN_PEPPER = PEPPER;
  });

  afterEach(() => {
    if (saved.pepper === undefined) delete process.env.GUEST_TOKEN_PEPPER;
    else process.env.GUEST_TOKEN_PEPPER = saved.pepper;
    process.env.NODE_ENV = saved.nodeEnv;
  });

  describe("getGuestTokenPepper", () => {
    it("returns the configured pepper, or the development fallback when unset outside production", () => {
      expect(getGuestTokenPepper()).toBe(PEPPER);
      delete process.env.GUEST_TOKEN_PEPPER;
      expect(getGuestTokenPepper()).toBe("managevent-local-dev-pepper-default-salt");
    });

    it("throws in production when the pepper is missing or shorter than 32 characters", () => {
      process.env.NODE_ENV = "production";
      delete process.env.GUEST_TOKEN_PEPPER;
      expect(() => getGuestTokenPepper()).toThrow(/GUEST_TOKEN_PEPPER/);
      process.env.GUEST_TOKEN_PEPPER = "too-short";
      expect(() => getGuestTokenPepper()).toThrow(/GUEST_TOKEN_PEPPER/);
      process.env.GUEST_TOKEN_PEPPER = "x".repeat(31);
      expect(() => getGuestTokenPepper()).toThrow(/GUEST_TOKEN_PEPPER/);
      process.env.GUEST_TOKEN_PEPPER = "x".repeat(32);
      expect(getGuestTokenPepper()).toBe("x".repeat(32));
    });
  });

  describe("salt and stable id", () => {
    it("generates a 64-character hex salt that differs every time", () => {
      const a = generateEventSalt();
      const b = generateEventSalt();
      expect(a).toMatch(/^[0-9a-f]{64}$/);
      expect(b).toMatch(/^[0-9a-f]{64}$/);
      expect(a).not.toBe(b);
    });

    it("generates random stable ids, and deterministic ones from an idempotency seed", () => {
      const random = generateStableId();
      expect(random).toMatch(/^s_[0-9a-f]{24}$/);
      expect(generateStableId()).not.toBe(random);
      expect(generateStableId("")).toMatch(/^s_[0-9a-f]{24}$/);

      const seeded = generateStableId("idem-key-1");
      expect(seeded).toMatch(/^k_[0-9a-f]{24}$/);
      expect(generateStableId("idem-key-1")).toBe(seeded);
      expect(generateStableId("idem-key-2")).not.toBe(seeded);
      expect(generateStableId("idem-key-1:0")).not.toBe(generateStableId("idem-key-1:1"));
    });
  });

  describe("slugifyName", () => {
    it("lowercases, strips diacritics and collapses everything else to single hyphens", () => {
      expect(slugifyName("The Smith Family", "guest")).toBe("the-smith-family");
      expect(slugifyName("  Zoë & José — Café!  ", "guest")).toBe("zoe-jose-cafe");
      expect(slugifyName("O'Brien / Nguyễn", "guest")).toBe("o-brien-nguyen");
      expect(slugifyName("Table #12", "guest")).toBe("table-12");
    });

    it("falls back when nothing usable remains", () => {
      expect(slugifyName("", "guest")).toBe("guest");
      expect(slugifyName("   ", "guest")).toBe("guest");
      expect(slugifyName("سارا و علی", "guest")).toBe("guest");
      expect(slugifyName("🎉🎉", "event")).toBe("event");
    });

    it("cuts to the maximum length without leaving a trailing hyphen", () => {
      const long = slugifyName("a".repeat(35) + " b", "guest");
      expect(long).toBe("a".repeat(35));
      expect(slugifyName("x".repeat(100), "guest")).toHaveLength(36);
      expect(slugifyName("x".repeat(100), "event", 40)).toHaveLength(40);
      expect(slugifyName("one two three", "guest", 8)).toBe("one-two");
    });
  });

  describe("deriveTokenSuffix", () => {
    it("is eight characters of the safe alphabet by default", () => {
      const suffix = deriveTokenSuffix(PEPPER, SALT, "s_abc");
      expect(suffix).toHaveLength(8);
      for (const char of suffix) {
        expect(SAFE_TOKEN_ALPHABET).toContain(char);
      }
      expect(suffix).not.toMatch(/[01ilo]/);
    });

    it("is deterministic and depends on the pepper, the salt, the stable id and the version", () => {
      const base = deriveTokenSuffix(PEPPER, SALT, "s_abc");
      expect(deriveTokenSuffix(PEPPER, SALT, "s_abc")).toBe(base);
      expect(deriveTokenSuffix(PEPPER, SALT, "s_abc", 0)).toBe(base);
      expect(deriveTokenSuffix(`${PEPPER}x`, SALT, "s_abc")).not.toBe(base);
      expect(deriveTokenSuffix(PEPPER, SALT.replace("00", "ff"), "s_abc")).not.toBe(base);
      expect(deriveTokenSuffix(PEPPER, SALT, "s_abd")).not.toBe(base);
      const v1 = deriveTokenSuffix(PEPPER, SALT, "s_abc", 1);
      const v2 = deriveTokenSuffix(PEPPER, SALT, "s_abc", 2);
      expect(v1).not.toBe(base);
      expect(v2).not.toBe(v1);
    });

    it("signs `salt:stableId` for version 0 and `salt:stableId:version` afterwards", () => {
      expect(deriveTokenSuffix(PEPPER, SALT, "s_abc", 0)).toBe(
        referenceSuffix(PEPPER, `${SALT}:s_abc`, 8),
      );
      expect(deriveTokenSuffix(PEPPER, SALT, "s_abc", 3)).toBe(
        referenceSuffix(PEPPER, `${SALT}:s_abc:3`, 8),
      );
    });

    it("skips digest bytes of 248 and above instead of folding them (no modulo bias)", () => {
      // Find an input whose first eight digest bytes include a rejected byte.
      let found: { stableId: string; digest: Buffer } | null = null;
      for (let i = 0; i < 5000 && !found; i += 1) {
        const stableId = `s_reject_${i}`;
        const digest = createHmac("sha256", PEPPER).update(`${SALT}:${stableId}`).digest();
        if (digest.subarray(0, 8).some((byte) => byte >= 248)) found = { stableId, digest };
      }
      expect(found).not.toBeNull();
      if (!found) return;

      const naive = [...found.digest.subarray(0, 8)]
        .map((byte) => SAFE_TOKEN_ALPHABET.charAt(byte % 31))
        .join("");
      const accepted = [...found.digest]
        .filter((byte) => byte < 248)
        .slice(0, 8)
        .map((byte) => SAFE_TOKEN_ALPHABET.charAt(byte % 31))
        .join("");
      const suffix = deriveTokenSuffix(PEPPER, SALT, found.stableId);
      expect(suffix).toBe(accepted);
      expect(suffix).not.toBe(naive);
    });

    it("draws further digests with a counter when one digest is not enough", () => {
      const long = deriveTokenSuffix(PEPPER, SALT, "s_abc", 0, 100);
      expect(long).toHaveLength(100);
      expect(long).toBe(referenceSuffix(PEPPER, `${SALT}:s_abc`, 100));
      // The short suffix is a prefix of the long one.
      expect(long.startsWith(deriveTokenSuffix(PEPPER, SALT, "s_abc"))).toBe(true);
      for (const char of long) {
        expect(SAFE_TOKEN_ALPHABET).toContain(char);
      }
    });

    it("spreads symbols evenly across the alphabet", () => {
      const counts = new Map<string, number>();
      const samples = 4000;
      for (let i = 0; i < samples; i += 1) {
        for (const char of deriveTokenSuffix(PEPPER, SALT, `s_dist_${i}`)) {
          counts.set(char, (counts.get(char) ?? 0) + 1);
        }
      }
      expect(counts.size).toBe(31);
      const expected = (samples * 8) / 31;
      for (const count of counts.values()) {
        // Roughly ±6 standard deviations: catches a biased mapping without being flaky.
        expect(Math.abs(count - expected)).toBeLessThan(200);
      }
    });

    it("rejects nonsensical lengths and versions", () => {
      expect(() => deriveTokenSuffix(PEPPER, SALT, "s_abc", 0, 0)).toThrow(RangeError);
      expect(() => deriveTokenSuffix(PEPPER, SALT, "s_abc", 0, 129)).toThrow(RangeError);
      expect(() => deriveTokenSuffix(PEPPER, SALT, "s_abc", -1)).toThrow(RangeError);
      expect(() => deriveTokenSuffix(PEPPER, SALT, "s_abc", 1.5)).toThrow(RangeError);
    });
  });

  describe("buildPartyToken and generateEventSlug", () => {
    it("builds `{slug}-{suffix}` tokens that satisfy GuestTokenSchema", () => {
      const token = buildPartyToken("The Smith Family", SALT, "s_abc", 0);
      expect(token).toBe(`the-smith-family-${deriveTokenSuffix(PEPPER, SALT, "s_abc", 0)}`);
      expect(GuestTokenSchema.safeParse(token).success).toBe(true);

      for (const name of ["", "سارا", "x".repeat(200), "A  --  B", "Zoë", "-- lead --"]) {
        const built = buildPartyToken(name, SALT, generateStableId(), 0);
        expect(GuestTokenSchema.safeParse(built).success).toBe(true);
      }
    });

    it("changes only the suffix on reissue and never depends on the display name for it", () => {
      const v0 = buildPartyToken("The Smith Family", SALT, "s_abc", 0);
      const v1 = buildPartyToken("The Smith Family", SALT, "s_abc", 1);
      expect(v1).not.toBe(v0);
      expect(v1.startsWith("the-smith-family-")).toBe(true);
      const renamed = buildPartyToken("The Smiths", SALT, "s_abc", 0);
      expect(renamed.slice(-8)).toBe(v0.slice(-8));
    });

    it("uses the pepper from the environment", () => {
      const withPepper = buildPartyToken("Guest", SALT, "s_abc", 0);
      process.env.GUEST_TOKEN_PEPPER = `${PEPPER}-other`;
      expect(buildPartyToken("Guest", SALT, "s_abc", 0)).not.toBe(withPepper);
    });

    it("generates event slugs that satisfy SafeEventSlugSchema with a random 4-character suffix", () => {
      const slugs = new Set<string>();
      for (const title of ["Sara & Ali's Wedding", "", "جشن", "x".repeat(300), "50th Birthday!"]) {
        for (let i = 0; i < 20; i += 1) {
          const slug = generateEventSlug(title);
          expect(SafeEventSlugSchema.safeParse(slug).success).toBe(true);
          expect(slug.length).toBeLessThanOrEqual(45);
          expect(slug).toMatch(/-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/);
          slugs.add(slug);
        }
      }
      expect(generateEventSlug("Sara & Ali's Wedding").startsWith("sara-ali-s-wedding-")).toBe(
        true,
      );
      expect(generateEventSlug("").startsWith("event-")).toBe(true);
      // 100 draws over 31^4 suffixes: collisions are possible but not wholesale.
      expect(slugs.size).toBeGreaterThan(90);
    });
  });

  describe("pass signatures", () => {
    it("signs a pass as MV1.{passId}.{32-character signature} and parses it back", () => {
      const { sig, qr } = signPass(SALT, PASS_ID, EVENT_ID);
      expect(sig).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(qr).toBe(`MV1.${PASS_ID}.${sig}`);
      expect(qr.length).toBeLessThanOrEqual(200);
      expect(verifyPassQr(qr)).toEqual({ passId: PASS_ID, sig });
      expect(verifyPassQr(`  ${qr}\n`)).toEqual({ passId: PASS_ID, sig });
      expect(isPassSignatureValid(SALT, PASS_ID, EVENT_ID, sig)).toBe(true);
    });

    it("matches the documented construction", () => {
      const eventKey = createHmac("sha256", PEPPER).update(`pass-v1:${SALT}`).digest();
      const expected = createHmac("sha256", eventKey)
        .update(`${PASS_ID}.${EVENT_ID}`)
        .digest("base64url")
        .slice(0, 32);
      expect(signPass(SALT, PASS_ID, EVENT_ID).sig).toBe(expected);
    });

    it("is deterministic and bound to the pass, the event, the salt and the pepper", () => {
      const { sig } = signPass(SALT, PASS_ID, EVENT_ID);
      expect(signPass(SALT, PASS_ID, EVENT_ID).sig).toBe(sig);

      const otherPass = PASS_ID.replace(/1$/, "9");
      const otherEvent = EVENT_ID.replace(/2$/, "9");
      const otherSalt = SALT.replace("00", "ff");
      expect(signPass(SALT, otherPass, EVENT_ID).sig).not.toBe(sig);
      expect(signPass(SALT, PASS_ID, otherEvent).sig).not.toBe(sig);
      expect(signPass(otherSalt, PASS_ID, EVENT_ID).sig).not.toBe(sig);

      expect(isPassSignatureValid(SALT, otherPass, EVENT_ID, sig)).toBe(false);
      expect(isPassSignatureValid(SALT, PASS_ID, otherEvent, sig)).toBe(false);
      expect(isPassSignatureValid(otherSalt, PASS_ID, EVENT_ID, sig)).toBe(false);
      expect(isPassSignatureValid(SALT, PASS_ID, EVENT_ID, `${sig.slice(0, 31)}!`)).toBe(false);
      expect(isPassSignatureValid(SALT, PASS_ID, EVENT_ID, sig.slice(0, 31))).toBe(false);
      expect(isPassSignatureValid(SALT, PASS_ID, EVENT_ID, "")).toBe(false);

      process.env.GUEST_TOKEN_PEPPER = `${PEPPER}-rotated`;
      expect(isPassSignatureValid(SALT, PASS_ID, EVENT_ID, sig)).toBe(false);
    });

    it("rejects anything that is not a well-formed MV1 payload", () => {
      const { sig } = signPass(SALT, PASS_ID, EVENT_ID);
      const bad = [
        "",
        "MV1",
        `MV2.${PASS_ID}.${sig}`,
        `mv1.${PASS_ID}.${sig}`,
        `MV1.${PASS_ID}`,
        `MV1.${PASS_ID}.${sig}.extra`,
        `MV1.pass_not-a-uuid.${sig}`,
        `MV1.gst_0192b400-0000-7000-8000-000000000001.${sig}`,
        `MV1.${PASS_ID}.${sig.slice(0, 31)}`,
        `MV1.${PASS_ID}.${sig}x`,
        `MV1.${PASS_ID}.${"*".repeat(32)}`,
        "https://invitation.managevent.com.au/i/some-event-7kq2/some-guest-7kq2m9xp",
        `MV1.${PASS_ID}.${sig}${" ".repeat(300)}`,
      ];
      for (const qr of bad) {
        expect(verifyPassQr(qr)).toBeNull();
      }
      expect(verifyPassQr(undefined as unknown as string)).toBeNull();
    });
  });
});
