import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_PATH_HEADER, ADMIN_RESPONSE_HEADERS, isAdminPath } from "./lib/admin/constants";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/en" || path.startsWith("/en/")) {
    const target = request.nextUrl.clone();
    target.pathname = path.replace(/^\/en/, "") || "/";
    return NextResponse.redirect(target, 308);
  }
  if (path === "/fa" || path.startsWith("/fa/")) {
    // Persian pages were retired; keep old links alive.
    const target = request.nextUrl.clone();
    target.pathname = path.replace(/^\/fa/, "") || "/";
    return NextResponse.redirect(target, 301);
  }
  if (isAdminPath(path)) {
    // The staff console has its own root layout (`app/admin`), outside the locale tree. It is
    // told which page was asked for, so a signed-out visitor returns there after signing in.
    // The header is always overwritten here, so a caller cannot supply its own.
    const headers = new Headers(request.headers);
    headers.set(ADMIN_PATH_HEADER, `${path}${request.nextUrl.search}`);
    const response = NextResponse.next({ request: { headers } });
    for (const [name, value] of Object.entries(ADMIN_RESPONSE_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/en${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // `/api/*` is left alone so route handlers (the auth proxy among them) are never rewritten
  // into the locale tree. Static files in /public are excluded for the same reason.
  matcher: [
    "/((?!api/|_next|favicon.ico|icon.svg|sitemap.xml|robots.txt|opengraph-image|hero.webp|brand/).*)",
  ],
};
