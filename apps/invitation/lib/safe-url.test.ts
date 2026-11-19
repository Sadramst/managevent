import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./client-ip";
import { isSafeCheckoutRedirectUrl, safeExternalHttpsUrl } from "./safe-url";

describe("safe-url", () => {
  it("accepts only https:// external URLs and rejects script/data/http schemes", () => {
    expect(safeExternalHttpsUrl("https://maps.google.com/?q=Perth")).toBe(
      "https://maps.google.com/?q=Perth",
    );
    for (const bad of [
      "",
      "   ",
      null,
      undefined,
      "http://example.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "//evil.example/path",
      "not a url",
    ]) {
      expect(safeExternalHttpsUrl(bad), String(bad)).toBeNull();
    }
  });

  it("allows only same-origin Studio checkout paths or checkout.stripe.com", () => {
    expect(isSafeCheckoutRedirectUrl("/studio/evt_123/checkout?session_id=cs_sim_1")).toBe(true);
    expect(isSafeCheckoutRedirectUrl("https://checkout.stripe.com/c/pay/cs_live_123")).toBe(true);

    for (const bad of [
      "",
      null,
      undefined,
      "https://evil.example/studio/evt_1/checkout",
      "https://checkout.stripe.com.evil.example/pay",
      "http://checkout.stripe.com/c/pay/cs_123",
      "//evil.example/studio/evt_1",
      "/studio/evt_1\\@evil.example",
      "javascript:alert(1)",
      "/other/path",
    ]) {
      expect(isSafeCheckoutRedirectUrl(bad), String(bad)).toBe(false);
    }
  });
});

describe("client-ip", () => {
  it("accepts valid IPv4/IPv6 literals and drops malformed or spoofed values", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "203.0.113.42" }))).toBe("203.0.113.42");
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "2001:db8::1, 10.0.0.1" })),
    ).toBe("2001:db8::1");

    for (const bad of ["::::", "999.999.999.999", "1.2.3.4.5", "not-an-ip", "203.0.113.1\r\nX:1"]) {
      const headers = { get: (name: string) => (name === "x-real-ip" ? bad : null) };
      expect(clientIpFromHeaders(headers), bad).toBeUndefined();
    }
  });
});
