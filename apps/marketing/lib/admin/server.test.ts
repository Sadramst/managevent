import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The staff gates, with the API and Next's request helpers replaced: what a console page and a
 * console server action do for a staff session, a signed-in host, and no session at all.
 */
const state = vi.hoisted(() => ({
  me: null as null | { id: string; name: string; email: string; roles: string[] },
  meFails: false,
  incoming: new Headers(),
  clientOptions: [] as Record<string, unknown>[],
}));

class RedirectSignal extends Error {
  constructor(readonly location: string) {
    super(`redirect:${location}`);
  }
}

vi.mock("next/headers", () => ({ headers: async () => state.incoming }));
vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new RedirectSignal(location);
  },
}));
vi.mock("@managevent/api-client", () => ({
  isApiError: () => false,
  createApiClient: (options: Record<string, unknown>) => {
    state.clientOptions.push(options);
    return {
      me: {
        get: async () => {
          if (state.meFails) throw new Error("API unreachable");
          return { user: state.me };
        },
      },
    };
  },
}));

const { getServerApi, isActionFailure, requireStaff, requireStaffForAction } =
  await import("./server");

const staff = { id: "usr_staff", name: "Planner", email: "p@example.com", roles: ["SUPER_ADMIN"] };
const host = { id: "usr_host", name: "Host", email: "h@example.com", roles: ["CUSTOMER_HOST"] };
const LEAD_PATH = "/admin/leads/lead_0192b400-0000-7000-8000-000000000001";

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (err) {
    if (err instanceof RedirectSignal) return err.location;
    throw err;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  state.me = null;
  state.meFails = false;
  state.incoming = new Headers();
  state.clientOptions = [];
});

describe("requireStaff (console pages)", () => {
  it("returns the staff member", async () => {
    state.me = staff;
    await expect(requireStaff()).resolves.toMatchObject({ id: "usr_staff", role: "SUPER_ADMIN" });
  });

  it("sends a visitor with no session to sign in, remembering the page", async () => {
    state.incoming = new Headers({ "x-managevent-admin-path": LEAD_PATH });
    expect(await redirectOf(requireStaff)).toBe(
      `/admin/sign-in?next=${encodeURIComponent(LEAD_PATH)}`,
    );
  });

  it("sends a signed-in host away with the staff-only notice", async () => {
    state.me = host;
    expect(await redirectOf(requireStaff)).toBe("/admin/sign-in?reason=staff");
  });

  it("never honours a requested path outside the console", async () => {
    state.incoming = new Headers({ "x-managevent-admin-path": "//evil.example/admin" });
    expect(await redirectOf(requireStaff)).toBe("/admin/sign-in");
  });
});

describe("requireStaffForAction (console server actions)", () => {
  it("returns the staff member", async () => {
    state.me = staff;
    const result = await requireStaffForAction(LEAD_PATH);
    expect(isActionFailure(result)).toBe(false);
    expect(result).toMatchObject({ id: "usr_staff" });
  });

  it("refuses a signed-in host without redirecting or touching lead data", async () => {
    state.me = host;
    const result = await requireStaffForAction(LEAD_PATH);
    expect(isActionFailure(result)).toBe(true);
    expect(result).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("refuses an account whose only roles are not staff roles", async () => {
    state.me = { ...host, roles: ["VENDOR", "CHECKIN_CREW", "GUEST"] };
    expect(await requireStaffForAction(LEAD_PATH)).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("redirects a caller with no session to sign in", async () => {
    expect(await redirectOf(() => requireStaffForAction(LEAD_PATH))).toBe(
      `/admin/sign-in?reason=session&next=${encodeURIComponent(LEAD_PATH)}`,
    );
  });

  it("fails closed when the session cannot be checked", async () => {
    state.meFails = true;
    expect(await requireStaffForAction(LEAD_PATH)).toEqual({ ok: false, code: "INTERNAL_ERROR" });
  });
});

describe("getServerApi", () => {
  it("forwards the visitor's cookie, user agent and edge-reported address", async () => {
    state.incoming = new Headers({
      cookie: "managevent.session_token=abc",
      "user-agent": "Test",
      "x-real-ip": "203.0.113.7",
      // Not a header our edge sets: must not win over x-real-ip.
      "fly-client-ip": "192.0.2.66",
    });
    await getServerApi();
    expect(state.clientOptions.at(-1)).toMatchObject({
      cookie: "managevent.session_token=abc",
      userAgent: "Test",
      forwardedFor: "203.0.113.7",
    });
  });
});
