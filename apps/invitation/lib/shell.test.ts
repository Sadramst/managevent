import { afterEach, describe, expect, it, vi } from "vitest";
import { authErrorKey, looksLikeEmail, passwordStrength } from "./auth-client";
import { clientIpFromHeaders } from "./client-ip";
import {
  formatLocalDate,
  formatLocalDateShort,
  formatLocalDateTime,
  formatLocalTime,
  formatScheduleTime,
  joinLocal,
  splitLocal,
} from "./dates";

describe("dates", () => {
  it("formats the API's local wall-clock strings without Intl", () => {
    expect(formatLocalDateTime("2026-10-23T16:30")).toBe("Friday, 23 October 2026 at 4:30 PM");
    expect(formatLocalDateTime("2026-10-23T16:30", { weekday: false })).toBe(
      "23 October 2026 at 4:30 PM",
    );
    expect(formatLocalDate("2026-10-23T16:30")).toBe("23 October 2026");
    expect(formatLocalDate("2026-10-23T16:30", { weekday: true })).toBe("Friday, 23 October 2026");
    expect(formatLocalDateShort("2026-10-03T09:05")).toBe("03/10/2026");
    expect(formatLocalTime("2026-10-23T00:05")).toBe("12:05 AM");
    expect(formatLocalTime("2026-10-23T12:00")).toBe("12:00 PM");
    expect(formatScheduleTime("18:30")).toBe("6:30 PM");
  });

  it("returns unparseable input unchanged instead of throwing", () => {
    expect(formatLocalDateTime("soon")).toBe("soon");
    expect(formatLocalTime("2026-10-23")).toBe("2026-10-23");
    expect(formatScheduleTime("late")).toBe("late");
  });

  it("splits and joins values for date and time inputs", () => {
    expect(splitLocal("2026-10-23T16:30")).toEqual({ date: "2026-10-23", time: "16:30" });
    expect(splitLocal(null)).toEqual({ date: "", time: "" });
    expect(joinLocal("2026-10-23", "16:30")).toBe("2026-10-23T16:30");
    expect(joinLocal("2026-10-23", "")).toBeNull();
    expect(joinLocal("", "16:30")).toBeNull();
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers the header the hosting edge sets", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9, 10.0.0.1",
      "x-vercel-forwarded-for": "203.0.113.7",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for hop", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "2001:db8::1, 10.0.0.1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("drops values that are not address-shaped", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "<script>alert(1)</script>" })),
    ).toBeUndefined();
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "not an ip" }))).toBeUndefined();
    expect(clientIpFromHeaders(new Headers())).toBeUndefined();
  });
});

describe("auth-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Better Auth and API error bodies to message keys", () => {
    expect(authErrorKey(401, { code: "INVALID_EMAIL_OR_PASSWORD", message: "x" })).toBe(
      "invalidCredentials",
    );
    expect(authErrorKey(401, null)).toBe("invalidCredentials");
    expect(authErrorKey(422, { code: "USER_ALREADY_EXISTS" })).toBe("accountExists");
    expect(authErrorKey(400, { code: "PASSWORD_TOO_SHORT" })).toBe("passwordTooShort");
    expect(authErrorKey(429, { error: { code: "RATE_LIMITED" } })).toBe("rateLimited");
    expect(authErrorKey(429, { message: "Too many requests" })).toBe("rateLimited");
    expect(authErrorKey(502, { error: { code: "NETWORK_ERROR" } })).toBe("network");
    expect(authErrorKey(401, { code: "INVALID_TWO_FACTOR_COOKIE" })).toBe("twoFactorExpired");
    expect(authErrorKey(400, { code: "INVALID_CODE" })).toBe("invalidCode");
    expect(authErrorKey(400, { code: "INVALID_TOKEN" })).toBe("invalidToken");
    expect(authErrorKey(500, { code: "constructor" })).toBe("unknown");
    expect(authErrorKey(500, "boom")).toBe("unknown");
  });

  it("checks email shape loosely", () => {
    expect(looksLikeEmail("sara@example.com")).toBe(true);
    expect(looksLikeEmail(" sara@example.com ")).toBe(true);
    expect(looksLikeEmail("sara@example")).toBe(false);
    expect(looksLikeEmail("sara example@x.com")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
  });

  it("scores password strength by length first", () => {
    expect(passwordStrength("short")).toBe(0);
    expect(passwordStrength("123456789")).toBe(0);
    expect(passwordStrength("aaaaaaaaaaaaaaaaaaaa")).toBe(1);
    expect(passwordStrength("lowercaseonly")).toBe(1);
    expect(passwordStrength("Mixed-case-9")).toBe(2);
    expect(passwordStrength("four quiet words")).toBe(2);
    expect(passwordStrength("correct horse battery staple")).toBe(3);
    expect(passwordStrength("Longer-Mixed-99")).toBe(3);
  });
});
