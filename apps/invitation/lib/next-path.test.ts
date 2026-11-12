import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath, signInPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths, with query and hash", () => {
    expect(safeNextPath("/studio")).toBe("/studio");
    expect(safeNextPath("/studio/evt_123/guests?tab=2#party")).toBe(
      "/studio/evt_123/guests?tab=2#party",
    );
    expect(safeNextPath("/studio/new?template=royal-classic")).toBe(
      "/studio/new?template=royal-classic",
    );
    expect(safeNextPath("/check-in/evt_123")).toBe("/check-in/evt_123");
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(safeNextPath(["/studio/new", "https://evil.example"])).toBe("/studio/new");
  });

  it.each([
    ["absolute URL", "https://evil.example/studio"],
    ["protocol-relative URL", "//evil.example/studio"],
    ["backslash host", "/\\evil.example"],
    ["double backslash", "\\\\evil.example"],
    ["scheme without slashes", "javascript:alert(1)"],
    ["data URL", "data:text/html,hi"],
    ["relative without a leading slash", "studio"],
    ["tab inside the slashes", "/\t/evil.example"],
    ["newline", "/studio\n//evil.example"],
    ["space", "/ /evil.example"],
    ["encoded slashes that normalise to //", "/.//evil.example"],
    ["empty", ""],
  ])("rejects %s", (_name, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_SIGN_IN);
  });

  it("rejects missing and oversized values", () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeNextPath(`/${"a".repeat(3000)}`)).toBe(DEFAULT_AFTER_SIGN_IN);
  });

  it("never returns to an auth page or an API route", () => {
    for (const path of [
      "/sign-in",
      "/sign-in?next=/studio",
      "/sign-in/two-factor",
      "/sign-up",
      "/reset-password?token=abc",
      "/api/auth/sign-out",
    ]) {
      expect(safeNextPath(path)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
    // A path that merely starts with the same letters is fine.
    expect(safeNextPath("/sign-installation")).toBe("/sign-installation");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("https://evil.example", "/")).toBe("/");
  });
});

describe("signInPath", () => {
  it("adds an encoded next for a deep link", () => {
    expect(signInPath("/studio/evt_1/guests?q=a b")).toBe("/sign-in");
    expect(signInPath("/studio/evt_1/guests?q=a")).toBe(
      "/sign-in?next=%2Fstudio%2Fevt_1%2Fguests%3Fq%3Da",
    );
  });

  it("drops next for the default destination and for unsafe values", () => {
    expect(signInPath("/studio")).toBe("/sign-in");
    expect(signInPath(null)).toBe("/sign-in");
    expect(signInPath("//evil.example")).toBe("/sign-in");
  });
});
