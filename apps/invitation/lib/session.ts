import "server-only";

import type { MeResponse } from "@managevent/validators";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { signInPath } from "./next-path";
import { REQUEST_PATH_HEADER } from "./request-path";
import { getServerApi } from "./server-api";

export type Capabilities = MeResponse["capabilities"];
export type SessionUser = NonNullable<MeResponse["user"]>;

/** What a page sees when the API cannot be reached: signed out, every optional feature off. */
const SIGNED_OUT: MeResponse = {
  user: null,
  capabilities: {
    emailPassword: true,
    magicLink: false,
    passwordReset: false,
    emailInvitations: false,
    stripeCheckout: false,
  },
};

/**
 * `GET /v1/me` for the current request: the signed-in user (or null) and what this deployment
 * can do. Cached per request. Throws when the API is unreachable; use it where the page cannot
 * work without the API anyway (the studio).
 *
 * Never sniff the session cookie in this app: this call is the only source of "who is signed in".
 */
export const getMe = cache(async (): Promise<MeResponse> => {
  const api = await getServerApi();
  return api.me.get();
});

/**
 * As `getMe`, but an unreachable API reads as signed out with every optional capability off.
 * For public pages and the site chrome, which must still render when the API is down.
 */
export const getMeOptional = cache(async (): Promise<MeResponse> => {
  try {
    return await getMe();
  } catch {
    return SIGNED_OUT;
  }
});

/**
 * Requires a signed-in host. Signed out → redirect to `/sign-in?next=<next>`. Returns the user
 * and the deployment capabilities.
 *
 * `next` is where to return after signing in. Leave it out in pages and layouts under
 * `/studio` and `/check-in`: the path being requested is used (recorded by `proxy.ts`). Pass it
 * in a server action, where the request path is the page that posted the action only by
 * accident. Either way it goes through `safeNextPath`, so only a same-origin path survives.
 *
 * Call it at the top of every studio and check-in page, layout and server action. The API
 * enforces permissions on every route as well; this only decides where a signed-out person goes.
 */
export async function requireHost(
  next?: string,
): Promise<{ user: SessionUser; capabilities: Capabilities }> {
  const me = await getMe();
  if (!me.user) {
    const requested = next ?? (await headers()).get(REQUEST_PATH_HEADER);
    redirect(signInPath(requested));
  }
  return { user: me.user, capabilities: me.capabilities };
}
