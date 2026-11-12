import { ManageventApiClientError } from "@managevent/api-client";
import { invitationShellEn } from "@managevent/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorMessage, fail, ok, runAction, toActionFailure } from "./action-result";

function apiError(status: number, code: string, details?: unknown): ManageventApiClientError {
  return new ManageventApiClientError(status, {
    code,
    message: "server text that must not reach the person",
    requestId: "req_test",
    ...(details !== undefined ? { details } : {}),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ok and fail", () => {
  it("builds results", () => {
    expect(ok()).toEqual({ ok: true, data: undefined });
    expect(ok({ id: "evt_1" })).toEqual({ ok: true, data: { id: "evt_1" } });
    expect(fail("STALE_WRITE")).toEqual({
      ok: false,
      code: "STALE_WRITE",
      message: invitationShellEn.errors.STALE_WRITE,
    });
    expect(fail("VALIDATION_ERROR", { fieldErrors: { title: ["Enter a title."] } })).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: invitationShellEn.errors.VALIDATION_ERROR,
      fieldErrors: { title: ["Enter a title."] },
    });
  });

  it("has a friendly message for every documented API error code", () => {
    const codes = [
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "FEATURE_NOT_IN_PLAN",
      "PLAN_LIMIT_EXCEEDED",
      "DEMO_READ_ONLY",
      "PREVIEW_READ_ONLY",
      "NOT_FOUND",
      "CONFLICT",
      "RSVP_CLOSED",
      "NOT_PUBLISHED",
      "SLUG_TAKEN",
      "STALE_WRITE",
      "ALREADY_PREMIUM",
      "MEMORIAL_COMPLIMENTARY",
      "PAYMENT_NOT_COMPLETED",
      "QUIET_HOURS",
      "LINK_REVOKED",
      "PUBLISH_REQUIREMENTS_NOT_MET",
      "RATE_LIMITED",
      "EMAIL_NOT_CONFIGURED",
      "PAYMENTS_NOT_CONFIGURED",
      "QUEUE_UNAVAILABLE",
      "INTERNAL_ERROR",
      "NETWORK_ERROR",
    ];
    for (const code of codes) {
      expect(errorMessage(code), code).not.toBe(invitationShellEn.errors.UNKNOWN);
    }
    expect(errorMessage("SOMETHING_NEW")).toBe(invitationShellEn.errors.UNKNOWN);
    // Object.prototype keys are not codes.
    expect(errorMessage("toString")).toBe(invitationShellEn.errors.UNKNOWN);
  });
});

describe("toActionFailure", () => {
  it("maps an API error to its code and friendly message, never the server text", () => {
    const failure = toActionFailure(apiError(409, "STALE_WRITE"));
    expect(failure).toEqual({
      ok: false,
      code: "STALE_WRITE",
      message: invitationShellEn.errors.STALE_WRITE,
    });
  });

  it("lifts field messages out of a VALIDATION_ERROR", () => {
    const failure = toActionFailure(
      apiError(400, "VALIDATION_ERROR", {
        formErrors: [],
        fieldErrors: { title: ["Required"], startsAtLocal: ["Invalid"], broken: "nope" },
      }),
    );
    expect(failure.code).toBe("VALIDATION_ERROR");
    expect(failure.fieldErrors).toEqual({ title: ["Required"], startsAtLocal: ["Invalid"] });
  });

  it("keeps details the page needs, such as what is missing before publishing", () => {
    const failure = toActionFailure(
      apiError(422, "PUBLISH_REQUIREMENTS_NOT_MET", { missing: ["VENUE"] }),
    );
    expect(failure.details).toEqual({ missing: ["VENUE"] });
    expect(failure.fieldErrors).toBeUndefined();
  });

  it("maps input rejected before the request was sent (ZodError)", () => {
    const parsed = z.object({ displayName: z.string().min(1) }).safeParse({ displayName: "" });
    expect(parsed.success).toBe(false);
    const failure = toActionFailure(parsed.error);
    expect(failure.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(failure.fieldErrors ?? {})).toEqual(["displayName"]);
  });

  it("maps a network failure", () => {
    expect(toActionFailure(apiError(0, "NETWORK_ERROR")).message).toBe(
      invitationShellEn.errors.NETWORK_ERROR,
    );
  });

  it("maps anything else to UNKNOWN and logs only the error name", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = toActionFailure(new TypeError("guest sara@example.com exploded"));
    expect(failure).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: invitationShellEn.errors.UNKNOWN,
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]?.[0])).not.toContain("sara@example.com");
  });
});

describe("runAction", () => {
  it("wraps a successful body", async () => {
    await expect(runAction(async () => 42)).resolves.toEqual({ ok: true, data: 42 });
  });

  it("turns a thrown API error into a failure", async () => {
    const result = await runAction(async () => {
      throw apiError(403, "PLAN_LIMIT_EXCEEDED");
    });
    expect(result).toEqual({
      ok: false,
      code: "PLAN_LIMIT_EXCEEDED",
      message: invitationShellEn.errors.PLAN_LIMIT_EXCEEDED,
    });
  });

  it("lets redirect() pass through", async () => {
    const { redirect } = await import("next/navigation");
    await expect(
      runAction(async () => {
        redirect("/studio");
      }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
