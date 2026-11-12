/**
 * Same-origin proxy to the API's Better Auth mount, so the browser signs in on this site and the
 * session cookie is set here. Used by the staff console (`/admin/sign-in`) only: the endpoint
 * allowlist, body cap and header rules live in `lib/auth-proxy.ts`.
 *
 * `proxy.ts` leaves `/api/*` out of the locale rewrite.
 */
import { proxyAuthRequest } from "../../../../lib/auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forward(request: Request): Promise<Response> {
  return proxyAuthRequest(request, {
    apiUrl: process.env.API_URL || "http://localhost:4000",
    proxySecret: process.env.API_PROXY_SECRET,
  });
}

// GET is answered too, so every path the console does not use is a plain 404.
export const GET = forward;
export const POST = forward;
