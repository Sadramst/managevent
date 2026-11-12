import { createApiClient, isApiError } from "@managevent/api-client";
import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { buildGuestStatusHtml, GUEST_STATUS_HEADERS } from "@/lib/guest/gone-page";
import { parseGuestPath } from "@/lib/guest/paths";
import { REQUEST_PATH_HEADER } from "@/lib/request-path";

/**
 * Next 16 proxy (the file formerly called middleware).
 *
 * 1. `/studio/*` and `/check-in/*` (shell, done): records the requested path in a request
 *    header, so a layout that finds the visitor signed out can send them to
 *    `/sign-in?next=<the page they asked for>` (`requireHost()` in `lib/session.ts`). Layouts
 *    cannot read the URL any other way. The header is always overwritten here, so a value sent
 *    by the browser is never used.
 *
 * 2. `/i/{eventSlug}/{guestToken}[/...]` (guest links): asks the API whether the link is still
 *    active. A link the host has turned off answers `410 Gone`, and a visitor over the rate
 *    limit for guest pages answers `429`, each with a small self-contained page (a page
 *    component cannot set those statuses). Every other outcome continues to the route: an
 *    unknown link becomes a real 404 there, and if the API cannot be reached the page reports
 *    it. The path is never logged: the token is a credential.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/i/")) {
    // Page and file requests only. A reply (a server action POST to this path) goes to the
    // API, which refuses a revoked link itself; the form shows that message.
    const isRead = request.method === "GET" || request.method === "HEAD";
    const link = isRead ? parseGuestPath(pathname) : null;
    const state = link ? await linkState(request, link.eventSlug, link.guestToken) : "continue";
    if (state === "gone") {
      return new NextResponse(buildGuestStatusHtml("gone"), {
        status: 410,
        headers: GUEST_STATUS_HEADERS,
      });
    }
    if (state === "busy") {
      return new NextResponse(buildGuestStatusHtml("busy"), {
        status: 429,
        headers: { ...GUEST_STATUS_HEADERS, "retry-after": "60" },
      });
    }
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

/**
 * `gone` when the API answers `410 LINK_REVOKED` for this link, `busy` when it answers
 * `429 RATE_LIMITED`, and `continue` for everything else (active, unknown, API unreachable).
 */
async function linkState(
  request: NextRequest,
  eventSlug: string,
  guestToken: string,
): Promise<"continue" | "gone" | "busy"> {
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const forwardedFor = clientIpFromHeaders(request.headers);
  // The visitor's cookie goes with the question, exactly as it does for the page itself
  // (`lib/server-api.ts`). Without it the API answers 404 for a host previewing their own
  // draft, and every such 404 counts against that address's limit for unknown links: a host
  // reloading their preview would lock themselves, and their guests, out with a 429.
  const cookie = request.headers.get("cookie") ?? undefined;
  const api = createApiClient({
    // The same server-side base URL as `lib/server-api.ts` (which needs a request scope the
    // proxy does not have).
    baseUrl: (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, ""),
    includeCredentials: false,
    ...(cookie ? { cookie } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(forwardedFor ? { forwardedFor } : {}),
  });
  try {
    await api.guestSite.getStatus(eventSlug, guestToken);
    return "continue";
  } catch (err) {
    if (isApiError(err, "LINK_REVOKED")) return "gone";
    if (isApiError(err, "RATE_LIMITED")) return "busy";
    return "continue";
  }
}

export const config = {
  matcher: ["/studio/:path*", "/check-in/:path*", "/i/:eventSlug/:guestToken*"],
};
