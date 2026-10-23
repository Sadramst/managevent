import { describe, it, expect, vi } from "vitest";
import { ProductionResendAdapter } from "./lead-created.js";

describe("production email gate", () => {
  it("uses a stable idempotency key when the verified provider accepts delivery", async () => {
    vi.stubEnv("RESEND_DOMAIN_VERIFIED", "true");
    vi.stubEnv("RESEND_API_KEY", "unit-test-placeholder");
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "mock-delivery" }), { status: 200 }));
    try {
      const result = await new ProductionResendAdapter(network).sendEmail(
        { from: "hello@managevent.com.au", to: "host@example.com", subject: "Test", text: "Test" },
        "lead-auto-reply:test-id",
      );
      expect(result.id).toBe("mock-delivery");
      expect(network).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          headers: expect.objectContaining({ "Idempotency-Key": "lead-auto-reply:test-id" }),
        }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("never sends before domain verification", async () => {
    vi.stubEnv("RESEND_DOMAIN_VERIFIED", "false");
    const network = vi.fn<typeof fetch>();
    try {
      await expect(
        new ProductionResendAdapter(network).sendEmail({
          from: "hello@managevent.com.au",
          to: "host@example.com",
          subject: "Test",
          text: "Test",
        }),
      ).rejects.toThrow("verification");
      expect(network).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
