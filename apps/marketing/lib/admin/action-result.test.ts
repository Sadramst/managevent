import { ManageventApiClientError } from "@managevent/api-client";
import { getAdminPages } from "@managevent/i18n";
import { describe, expect, it } from "vitest";
import { actionErrorMessage } from "./action-result";
import { toActionFailure } from "./api-failure";

const apiError = (status: number, code: string, details?: unknown) =>
  new ManageventApiClientError(status, {
    code,
    message: "Internal wording that must not reach the browser",
    requestId: "req_test",
    ...(details === undefined ? {} : { details }),
  });

describe("toActionFailure", () => {
  it("keeps the stable code and drops the API message and request id", () => {
    for (const [status, code] of [
      [401, "UNAUTHENTICATED"],
      [403, "FORBIDDEN"],
      [404, "NOT_FOUND"],
      [429, "RATE_LIMITED"],
      [0, "NETWORK_ERROR"],
    ] as const) {
      expect(toActionFailure(apiError(status, code))).toEqual({ ok: false, code });
    }
  });

  it("passes field errors through for a validation error only", () => {
    expect(
      toActionFailure(
        apiError(400, "VALIDATION_ERROR", {
          formErrors: [],
          fieldErrors: { notes: ["String must contain at most 5000 character(s)"], bad: [1, 2] },
        }),
      ),
    ).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { notes: ["String must contain at most 5000 character(s)"] },
    });
    expect(toActionFailure(apiError(400, "VALIDATION_ERROR", "not an object"))).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(toActionFailure(apiError(403, "FORBIDDEN", { fieldErrors: { x: ["y"] } }))).toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("reports anything that is not an API error as an internal error", () => {
    expect(toActionFailure(new Error("boom"))).toEqual({ ok: false, code: "INTERNAL_ERROR" });
    expect(toActionFailure("boom")).toEqual({ ok: false, code: "INTERNAL_ERROR" });
  });
});

describe("actionErrorMessage", () => {
  const errors = getAdminPages("en").errors;

  it("has a specific message for the codes a lead update can return", () => {
    for (const code of ["FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "RATE_LIMITED"] as const) {
      expect(actionErrorMessage(errors, code)).toBe(errors[code]);
      expect(errors[code]).not.toBe(errors.fallback);
    }
  });

  it("falls back for unknown codes and never reads inherited keys", () => {
    expect(actionErrorMessage(errors, "INTERNAL_ERROR")).toBe(errors.fallback);
    expect(actionErrorMessage(errors, "NETWORK_ERROR")).toBe(errors.fallback);
    expect(actionErrorMessage(errors, "toString")).toBe(errors.fallback);
    expect(actionErrorMessage(errors, "constructor")).toBe(errors.fallback);
  });
});
