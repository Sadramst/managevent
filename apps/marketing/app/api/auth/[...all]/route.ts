/**
 * Same-origin proxy to the API's Better Auth mount, so the browser signs in on this site and the
 * session cookie is set here. Used by the staff console (`/admin/sign-in`).
 *
 * `proxy.ts` leaves `/api/*` out of the locale rewrite.
 */
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  upstreamUrl,
} from "../../../../lib/auth-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiUrl = () => process.env.API_URL || "http://localhost:4000";

const NO_STORE = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

async function forward(request: Request): Promise<Response> {
  const target = upstreamUrl(apiUrl(), request.url);
  // Not an auth endpoint: nothing is forwarded.
  if (!target) {
    return Response.json(
      { code: "NOT_FOUND", message: "Not found" },
      { status: 404, headers: NO_STORE },
    );
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: buildUpstreamHeaders(request.headers, process.env.API_PROXY_SECRET),
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { code: "NETWORK_ERROR", message: "The sign-in service could not be reached" },
      { status: 502, headers: NO_STORE },
    );
  }
  // A 204 or 304 must not carry a body.
  const body = upstream.status === 204 || upstream.status === 304 ? null : upstream.body;
  return new Response(body, {
    status: upstream.status,
    headers: buildDownstreamHeaders(upstream.headers),
  });
}

export const GET = forward;
export const POST = forward;
