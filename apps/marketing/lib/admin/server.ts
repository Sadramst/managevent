/**
 * Server-side access to the API for the staff console: a client that forwards the visitor's
 * cookie, and the staff session check every console page starts with.
 *
 * The session cookie's name is never read here. `GET /v1/me` is the only source of truth. The
 * API re-checks the role on every lead route, so it stays the authority; the checks here make
 * sure no console page or server action even asks it on behalf of a non-staff session.
 */
import { createApiClient, type ManageventApiClient } from "@managevent/api-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clientIpFromHeaders } from "../client-ip";
import type { ActionFailure } from "./action-result";
import { toActionFailure } from "./api-failure";
import { ADMIN_PATH_HEADER } from "./constants";
import { isStaff, primaryStaffRole, signInHref, type StaffRole } from "./leads";

export async function getServerApi(): Promise<ManageventApiClient> {
  const incoming = await headers();
  const cookie = incoming.get("cookie");
  const userAgent = incoming.get("user-agent");
  const forwardedFor = clientIpFromHeaders(incoming);
  return createApiClient({
    baseUrl: process.env.API_URL || "http://localhost:4000",
    ...(cookie ? { cookie } : {}),
    ...(userAgent ? { userAgent } : {}),
    // The client adds `x-managevent-proxy-secret` from API_PROXY_SECRET when this is set.
    ...(forwardedFor ? { forwardedFor } : {}),
  });
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

export type StaffSession =
  | { status: "staff"; user: StaffUser }
  /** Signed in, but with an account that is not staff (for example an event host). */
  | { status: "not-staff" }
  | { status: "signed-out" };

/** One `GET /v1/me` per request, shared by the layout, the page and any action in it. */
export const getStaffSession = cache(async (): Promise<StaffSession> => {
  const { user } = await (await getServerApi()).me.get();
  if (!user) return { status: "signed-out" };
  const role = primaryStaffRole(user.roles);
  if (!role || !isStaff(user.roles)) return { status: "not-staff" };
  return { status: "staff", user: { id: user.id, name: user.name, email: user.email, role } };
});

/**
 * The signed-in staff member, or a redirect to the sign-in page that remembers where they were
 * going. A signed-in non-staff account is sent there too, with the "staff only" notice.
 */
export async function requireStaff(): Promise<StaffUser> {
  const session = await getStaffSession();
  if (session.status === "staff") return session.user;
  const requested = (await headers()).get(ADMIN_PATH_HEADER) ?? undefined;
  redirect(
    signInHref({
      ...(requested ? { next: requested } : {}),
      ...(session.status === "not-staff" ? { reason: "staff" as const } : {}),
    }),
  );
}

/**
 * The staff gate for a server action, checked on every call: an action is a public POST
 * endpoint, reachable without ever loading the page that renders its form.
 *
 * Returns the staff member; a failure to hand back to the form for a signed-in account that is
 * not staff (`FORBIDDEN`) or when the API cannot be asked; and redirects a caller with no
 * session to the sign-in page, remembering `next`.
 */
export async function requireStaffForAction(next: string): Promise<StaffUser | ActionFailure> {
  let session: StaffSession;
  try {
    session = await getStaffSession();
  } catch (err) {
    return toActionFailure(err);
  }
  if (session.status === "signed-out") redirect(signInHref({ reason: "session", next }));
  if (session.status === "not-staff") return { ok: false, code: "FORBIDDEN" };
  return session.user;
}

/** Narrows the result of `requireStaffForAction`. */
export function isActionFailure(result: StaffUser | ActionFailure): result is ActionFailure {
  return "ok" in result;
}
