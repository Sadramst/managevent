import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getStatus = vi.fn<(eventSlug: string, guestToken: string) => Promise<unknown>>();
const createApiClient = vi.fn((options: Record<string, unknown>) => {
  void options;
  return { guestSite: { getStatus } };
});

vi.mock("@managevent/api-client", () => ({
  createApiClient: (options: Record<string, unknown>) => createApiClient(options),
  isApiError: (error: unknown, code?: string) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (code === undefined || (error as { code: string }).code === code),
}));

const { proxy } = await import("../proxy");

const GUEST_PATH = "/i/amara-and-jon-k3xq/the-okafors-abcd2345";

function guestRequest(headers: Record<string, string> = {}, path = GUEST_PATH): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    headers: { "user-agent": "vitest", "x-forwarded-for": "203.0.113.7", ...headers },
  });
}

beforeEach(() => {
  getStatus.mockReset();
  createApiClient.mockClear();
  vi.stubEnv("API_URL", "http://api.internal:4000/");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy: guest links", () => {
  it("asks about the link as the visitor, cookie included", async () => {
    // A host previewing their own draft: without the cookie the API answers 404 to the status
    // question, and each of those 404s counts against the address's limit for unknown links.
    // After 30 reloads the preview, the samples and real guest links all answered 429.
    getStatus.mockResolvedValue({ state: "ACTIVE" });
    const response = await proxy(guestRequest({ cookie: "managevent.session_token=abc; other=1" }));

    expect(createApiClient).toHaveBeenCalledTimes(1);
    expect(createApiClient.mock.calls[0]?.[0]).toMatchObject({
      baseUrl: "http://api.internal:4000",
      includeCredentials: false,
      cookie: "managevent.session_token=abc; other=1",
      userAgent: "vitest",
      forwardedFor: "203.0.113.7",
    });
    expect(getStatus).toHaveBeenCalledWith("amara-and-jon-k3xq", "the-okafors-abcd2345");
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("sends no cookie option for a guest without one", async () => {
    getStatus.mockResolvedValue({ state: "ACTIVE" });
    await proxy(guestRequest());
    expect(createApiClient.mock.calls[0]?.[0]).not.toHaveProperty("cookie");
  });

  it("answers 410 for a link the host turned off and 429 over the limit", async () => {
    getStatus.mockRejectedValueOnce({ code: "LINK_REVOKED" });
    expect((await proxy(guestRequest())).status).toBe(410);

    getStatus.mockRejectedValueOnce({ code: "RATE_LIMITED" });
    const busy = await proxy(guestRequest());
    expect(busy.status).toBe(429);
    expect(busy.headers.get("retry-after")).toBe("60");
  });

  it("lets an unknown link through to the page, which answers the real 404", async () => {
    getStatus.mockRejectedValueOnce({ code: "NOT_FOUND" });
    const response = await proxy(guestRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
