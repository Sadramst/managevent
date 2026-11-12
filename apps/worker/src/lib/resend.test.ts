import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createResendAdapterFromEnv,
  invitationsFromAddress,
  isEmailConfigured,
  ResendAdapter,
  ResendDeliveryError,
  transactionalFromAddress,
} from "./resend.js";

const payload = {
  from: "Managevent <hello@managevent.com.au>",
  to: "guest@example.com",
  subject: "Subject",
  text: "Body",
};

const ok = (id: string) => new Response(JSON.stringify({ id }), { status: 200 });

describe("ResendAdapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("posts the message to Resend with the API key and the idempotency key", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(ok("re_123"));
    const adapter = new ResendAdapter({ apiKey: " re_unit_test_key ", fetchImpl: network });

    const result = await adapter.sendEmail(payload, "cmp:campaign:guest");
    expect(result).toEqual({ id: "re_123" });
    expect(network).toHaveBeenCalledTimes(1);

    const [url, init] = network.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer re_unit_test_key",
      "Content-Type": "application/json",
      "Idempotency-Key": "cmp:campaign:guest",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: payload.from,
      to: ["guest@example.com"],
      subject: "Subject",
      text: "Body",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends no Idempotency-Key header when none is given", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(ok("re_1"));
    await new ResendAdapter({ apiKey: "key", fetchImpl: network }).sendEmail(payload);
    expect(network.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Idempotency-Key");
  });

  it("retries a rate-limited or failing provider, honouring retry-after, then succeeds", async () => {
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "3" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(ok("re_after_retry"));
    const waits: number[] = [];
    const adapter = new ResendAdapter({
      apiKey: "key",
      fetchImpl: network,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });

    await expect(adapter.sendEmail(payload, "k")).resolves.toEqual({ id: "re_after_retry" });
    expect(network).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([3000, 2000]);
  });

  it("gives up after the retry budget and reports only the status", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 500 }));
    const adapter = new ResendAdapter({
      apiKey: "key",
      fetchImpl: network,
      maxRetries: 1,
      sleep: async () => {},
    });
    const failure = await adapter.sendEmail(payload).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(ResendDeliveryError);
    expect((failure as ResendDeliveryError).status).toBe(500);
    // The error must be safe to log: no recipient in it.
    expect((failure as Error).message).not.toContain("guest@example.com");
    expect(network).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rejected message (4xx)", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 422 }));
    const adapter = new ResendAdapter({ apiKey: "key", fetchImpl: network, sleep: async () => {} });
    await expect(adapter.sendEmail(payload)).rejects.toMatchObject({ status: 422 });
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("rejects a success response without a message id", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const adapter = new ResendAdapter({ apiKey: "key", fetchImpl: network });
    await expect(adapter.sendEmail(payload)).rejects.toThrow("Invalid Resend delivery response");
  });

  it("refuses an empty API key", () => {
    expect(() => new ResendAdapter({ apiKey: "   " })).toThrow("RESEND_API_KEY");
  });
});

describe("email configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("has no adapter, and no mock, when RESEND_API_KEY is not set", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isEmailConfigured()).toBe(false);
    expect(createResendAdapterFromEnv()).toBeNull();
    vi.stubEnv("RESEND_API_KEY", "   ");
    expect(createResendAdapterFromEnv()).toBeNull();
  });

  it("uses the real adapter whenever RESEND_API_KEY is set, with no other gate", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_env_key");
    vi.stubEnv("RESEND_DOMAIN_VERIFIED", "false");
    vi.stubEnv("NODE_ENV", "development");
    const network = vi.fn<typeof fetch>().mockResolvedValue(ok("re_env"));

    expect(isEmailConfigured()).toBe(true);
    const adapter = createResendAdapterFromEnv(network);
    expect(adapter).toBeInstanceOf(ResendAdapter);
    await expect(adapter?.sendEmail(payload)).resolves.toEqual({ id: "re_env" });
    expect(network.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer re_env_key",
    });
  });

  it("reads the sender addresses from the environment with safe defaults", () => {
    vi.stubEnv("EMAIL_FROM_TRANSACTIONAL", "");
    vi.stubEnv("EMAIL_FROM_INVITATIONS", "");
    expect(transactionalFromAddress()).toBe("Managevent <hello@managevent.com.au>");
    expect(invitationsFromAddress()).toBe("Managevent <hello@managevent.com.au>");

    vi.stubEnv("EMAIL_FROM_TRANSACTIONAL", "Team <team@example.com>");
    expect(invitationsFromAddress()).toBe("Team <team@example.com>");
    vi.stubEnv("EMAIL_FROM_INVITATIONS", "Invites <invite@example.com>");
    expect(invitationsFromAddress()).toBe("Invites <invite@example.com>");
    expect(transactionalFromAddress()).toBe("Team <team@example.com>");
  });
});
