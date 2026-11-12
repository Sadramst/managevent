import { ManageventApiClientError } from "@managevent/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectLegacyLink } from "./legacy";

const { resolveLegacy } = vi.hoisted(() => ({ resolveLegacy: vi.fn() }));

vi.mock("@/lib/server-api", () => ({
  getServerApi: async () => ({ guestSite: { resolveLegacy } }),
}));

// Next signals both outcomes by throwing; the stand-ins make them observable.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND_SIGNAL");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

function apiError(status: number, code: string): ManageventApiClientError {
  return new ManageventApiClientError(status, { code, message: code, requestId: "req_test" });
}

describe("redirectLegacyLink", () => {
  beforeEach(() => {
    resolveLegacy.mockReset();
  });

  it("redirects a known old link to the current guest page", async () => {
    resolveLegacy.mockResolvedValue({ eventSlug: "gala-night", guestToken: "tok-abc" });
    await expect(redirectLegacyLink("/anniversary/sara")).rejects.toThrow(
      "REDIRECT /i/gala-night/tok-abc",
    );
    expect(resolveLegacy).toHaveBeenCalledWith("/anniversary/sara");
  });

  it("answers an unknown link with a real 404", async () => {
    resolveLegacy.mockRejectedValue(apiError(404, "NOT_FOUND"));
    await expect(redirectLegacyLink("/e/gala/nobody")).rejects.toThrow("NOT_FOUND_SIGNAL");
  });

  it("treats a path the API rejects as not found", async () => {
    resolveLegacy.mockRejectedValue(apiError(400, "VALIDATION_ERROR"));
    await expect(redirectLegacyLink("/legacy/..")).rejects.toThrow("NOT_FOUND_SIGNAL");
  });

  it("does not call the API for a path that cannot be a link", async () => {
    await expect(redirectLegacyLink(`/legacy/${"x".repeat(400)}`)).rejects.toThrow(
      "NOT_FOUND_SIGNAL",
    );
    expect(resolveLegacy).not.toHaveBeenCalled();
  });

  it("lets other failures reach the error page rather than hiding them as a 404", async () => {
    resolveLegacy.mockRejectedValue(apiError(429, "RATE_LIMITED"));
    await expect(redirectLegacyLink("/anniversary/sara")).rejects.toThrow(ManageventApiClientError);
  });
});
