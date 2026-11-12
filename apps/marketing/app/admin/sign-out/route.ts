/**
 * Sign out of the staff console. A plain form post from the header, so it works without
 * JavaScript: the API ends the session, its `Set-Cookie` headers are passed back so the browser
 * drops the cookies, and the browser is sent to the sign-in page.
 *
 * The session cookie is `SameSite=Lax`, so a form on another site cannot trigger this with the
 * visitor's session; `Origin` is forwarded as well, and Better Auth checks it.
 */
import { buildUpstreamHeaders } from "../../../lib/auth-proxy";
import { signInHref } from "../../../lib/admin/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function seeOther(location: string, cookies: readonly string[] = []): Response {
  const headers = new Headers({
    location,
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function POST(request: Request): Promise<Response> {
  const headers = buildUpstreamHeaders(request.headers, process.env.API_PROXY_SECRET);
  // The auth endpoints accept JSON only; the browser sent a form.
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json");
  try {
    const upstream = await fetch(
      `${(process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "")}/api/auth/sign-out`,
      { method: "POST", headers, body: "{}", redirect: "manual", cache: "no-store" },
    );
    if (!upstream.ok) return seeOther("/admin");
    return seeOther(signInHref({ reason: "signed-out" }), upstream.headers.getSetCookie());
  } catch {
    // Still signed in: go back to the console rather than pretend otherwise.
    return seeOther("/admin");
  }
}
