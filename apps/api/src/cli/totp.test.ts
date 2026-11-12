/**
 * TOTP against the published RFC 6238 test vectors (SHA-1), and base32 against RFC 4648.
 */
import { describe, expect, it } from "vitest";
import { base32Decode, secretFromTotpUri, totpCode } from "./totp.js";

describe("base32Decode", () => {
  it("decodes the RFC 4648 test vectors", () => {
    const vectors: Array<[string, string]> = [
      ["", ""],
      ["MY======", "f"],
      ["MZXQ====", "fo"],
      ["MZXW6===", "foo"],
      ["MZXW6YQ=", "foob"],
      ["MZXW6YTB", "fooba"],
      ["MZXW6YTBOI======", "foobar"],
    ];
    for (const [encoded, decoded] of vectors) {
      expect(base32Decode(encoded).toString("utf8")).toBe(decoded);
    }
  });

  it("accepts lower case, spaces and missing padding, and rejects other characters", () => {
    expect(base32Decode("mzxw 6ytb oi").toString("utf8")).toBe("foobar");
    expect(() => base32Decode("MZXW1")).toThrow();
    expect(() => base32Decode("MZ-XW")).toThrow();
  });
});

describe("totpCode", () => {
  // RFC 6238 appendix B: the SHA-1 secret is the ASCII string "12345678901234567890".
  const secret = Buffer.from("12345678901234567890", "ascii");

  it("matches the RFC 6238 vectors at 8 digits", () => {
    const vectors: Array<[number, string]> = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
      [20000000000, "65353130"],
    ];
    for (const [seconds, code] of vectors) {
      expect(totpCode(secret, seconds * 1000, { digits: 8 })).toBe(code);
    }
  });

  it("defaults to 6 digits and a 30 second step, keeping leading zeros", () => {
    expect(totpCode(secret, 59_000)).toBe("287082");
    expect(totpCode(secret, 1111111109_000)).toBe("081804");
    // Same 30 second window, same code; next window, a different one.
    expect(totpCode(secret, 30_000)).toBe(totpCode(secret, 59_999));
    expect(totpCode(secret, 60_000)).not.toBe(totpCode(secret, 59_999));
  });
});

describe("secretFromTotpUri", () => {
  it("reads and decodes the secret parameter", () => {
    const uri =
      "otpauth://totp/Managevent:staff%40example.org?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Managevent&digits=6&period=30";
    expect(secretFromTotpUri(uri).toString("ascii")).toBe("12345678901234567890");
  });

  it("rejects a URI without a secret", () => {
    expect(() => secretFromTotpUri("otpauth://totp/Managevent:x?issuer=Managevent")).toThrow();
    expect(() => secretFromTotpUri("not a uri")).toThrow();
  });
});
