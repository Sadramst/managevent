import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_CACHE_TAG,
  CONTACT_REVALIDATE_SECONDS,
  fallbackContact,
  getContact,
} from "./contact";

/**
 * Where the public contact details come from: what staff saved (through the API), else the
 * environment's first-run default, else the built-in default. The site must never break because
 * the API is down.
 */
describe("fallbackContact", () => {
  it("uses the built-in email and no phone when nothing is configured", () => {
    expect(fallbackContact({})).toEqual({ email: "appilico.au@gmail.com", phone: "" });
    expect(fallbackContact({ CONTACT_EMAIL: "  ", CONTACT_PHONE: "  " })).toEqual({
      email: "appilico.au@gmail.com",
      phone: "",
    });
  });

  it("uses CONTACT_EMAIL and CONTACT_PHONE as first-run defaults", () => {
    expect(
      fallbackContact({ CONTACT_EMAIL: " team@example.com.au ", CONTACT_PHONE: "0412 345 678" }),
    ).toEqual({ email: "team@example.com.au", phone: "0412 345 678" });
  });
});

describe("getContact", () => {
  const realFetch = globalThis.fetch;
  const calls: { url: string; init: Record<string, unknown> | undefined }[] = [];

  function stubApi(respond: () => Response | Promise<Response>) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init as Record<string, unknown> | undefined });
      return respond();
    }) as typeof fetch;
  }

  beforeEach(() => {
    calls.length = 0;
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubEnv("CONTACT_EMAIL", "");
    vi.stubEnv("CONTACT_PHONE", "");
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.unstubAllEnvs();
  });

  it("returns what staff saved, read from the public endpoint with Next data-cache hints", async () => {
    stubApi(() =>
      Response.json({ contactEmail: "saved@example.com.au", contactPhone: "08 9123 4567" }),
    );
    await expect(getContact()).resolves.toEqual({
      email: "saved@example.com.au",
      phone: "08 9123 4567",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://api.test/v1/site-settings");
    expect(calls[0]?.init?.next).toEqual({
      revalidate: CONTACT_REVALIDATE_SECONDS,
      tags: [CONTACT_CACHE_TAG],
    });
    // The client's `no-store` would opt the page out of the cache, so it must not be sent.
    expect(calls[0]?.init?.cache).toBeUndefined();
    expect(calls[0]?.init).not.toHaveProperty("credentials", "include");
  });

  it("keeps a blank phone blank", async () => {
    stubApi(() => Response.json({ contactEmail: "saved@example.com.au", contactPhone: "" }));
    expect((await getContact()).phone).toBe("");
  });

  it("falls back to the environment defaults when the API cannot be reached", async () => {
    vi.stubEnv("CONTACT_EMAIL", "env@example.com.au");
    vi.stubEnv("CONTACT_PHONE", "0412 345 678");
    stubApi(() => {
      throw new TypeError("fetch failed");
    });
    await expect(getContact()).resolves.toEqual({
      email: "env@example.com.au",
      phone: "0412 345 678",
    });
  });

  it("falls back to the built-in default on an API error or a malformed answer", async () => {
    stubApi(() => new Response("nope", { status: 503 }));
    await expect(getContact()).resolves.toEqual({ email: "appilico.au@gmail.com", phone: "" });
    stubApi(() => Response.json({ contactEmail: "not-an-email", contactPhone: 5 }));
    await expect(getContact()).resolves.toEqual({ email: "appilico.au@gmail.com", phone: "" });
  });
});
