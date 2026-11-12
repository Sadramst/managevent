import { describe, expect, it } from "vitest";
import type { ActionResult } from "./action-result";
import { isRedirectError, settle } from "./client-action";

const NETWORK = "We could not reach Managevent. Check your connection and try again.";

/** What Next rejects a server action's promise with after `redirect()` (`getRedirectError`). */
function redirectError(url: string, type: "push" | "replace" = "push"): Error {
  const error = new Error("NEXT_REDIRECT") as Error & { digest: string; handled: boolean };
  error.digest = `NEXT_REDIRECT;${type};${url};303;`;
  error.handled = true;
  return error;
}

describe("settle", () => {
  it("returns the action's own result, success or failure", async () => {
    const ok: ActionResult<{ id: string }> = { ok: true, data: { id: "evt_1" } };
    await expect(settle(async () => ok, NETWORK)).resolves.toBe(ok);
    const refused: ActionResult<never> = { ok: false, code: "STALE_WRITE", message: "Changed" };
    await expect(settle(async () => refused, NETWORK)).resolves.toBe(refused);
  });

  it("turns a dropped connection into a NETWORK_ERROR result instead of throwing", async () => {
    const result = await settle<void>(async () => {
      throw new TypeError("Failed to fetch");
    }, NETWORK);
    expect(result).toEqual({ ok: false, code: "NETWORK_ERROR", message: NETWORK });
  });

  it("does not report a redirect as a failure", async () => {
    // A successful create or delete redirects, and `requireHost()` redirects to sign-in when
    // the session has ended. Next rejects the promise in each case; a "could not reach
    // Managevent" message here invited a second tap and a duplicate event.
    for (const url of ["/studio/evt_1?created=1", "/studio?deleted=1", "/sign-in?next=%2Fstudio"]) {
      await expect(
        settle<never>(async () => {
          throw redirectError(url);
        }, NETWORK),
      ).resolves.toBeNull();
    }
    await expect(
      settle<never>(async () => {
        throw redirectError("https://checkout.stripe.com/c/pay", "replace");
      }, NETWORK),
    ).resolves.toBeNull();
  });

  it("returns null when an action resolves with nothing", async () => {
    await expect(settle<void>(async () => undefined, NETWORK)).resolves.toBeNull();
  });
});

describe("isRedirectError", () => {
  it("recognises only Next's redirect error", () => {
    expect(isRedirectError(redirectError("/studio"))).toBe(true);
    expect(isRedirectError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isRedirectError({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })).toBe(false);
    expect(isRedirectError({ digest: 42 })).toBe(false);
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError("NEXT_REDIRECT;push;/studio;303;")).toBe(false);
  });
});
