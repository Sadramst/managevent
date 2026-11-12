import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmCheckout = vi.fn();
const getEvent = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/session", () => ({
  requireHost: vi.fn(async () => ({ user: { id: "usr_1" }, capabilities: {} })),
}));
vi.mock("@/lib/server-api", () => ({
  getServerApi: vi.fn(async () => ({
    billing: { confirmCheckout },
    events: { get: getEvent },
  })),
}));

const { confirmCheckoutAction } = await import("./actions");

beforeEach(() => {
  confirmCheckout.mockReset();
  getEvent.mockReset();
  revalidatePath.mockReset();
});

describe("confirmCheckoutAction", () => {
  it("returns the invitation's new stamp, read after the upgrade was applied", async () => {
    // Applying the plan writes the invitation row and moves its `updatedAt`. The Settings
    // forms save with `expectedUpdatedAt`; without the new value the host's next save (the
    // custom link they just paid for) was refused as "changed somewhere else".
    const order: string[] = [];
    confirmCheckout.mockImplementation(async () => {
      order.push("confirm");
      return { effectivePlan: "PREMIUM" };
    });
    getEvent.mockImplementation(async () => {
      order.push("get");
      return { invitation: { updatedAt: "2026-11-13T02:00:05.000Z" } };
    });

    const result = await confirmCheckoutAction("evt_1", "cs_test_a1b2c3");

    expect(order).toEqual(["confirm", "get"]);
    expect(confirmCheckout).toHaveBeenCalledWith("evt_1", { sessionId: "cs_test_a1b2c3" });
    expect(result).toEqual({
      ok: true,
      data: { effectivePlan: "PREMIUM", invitationUpdatedAt: "2026-11-13T02:00:05.000Z" },
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("reports a refusal without reading the event", async () => {
    confirmCheckout.mockRejectedValue(new Error("boom"));
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await confirmCheckoutAction("evt_1", "cs_test_a1b2c3");
    quiet.mockRestore();
    expect(result).toMatchObject({ ok: false, code: "UNKNOWN" });
    expect(getEvent).not.toHaveBeenCalled();
  });

  it("refuses an id that is not an id", async () => {
    const result = await confirmCheckoutAction("../etc", "cs_test_a1b2c3");
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(confirmCheckout).not.toHaveBeenCalled();
  });
});
