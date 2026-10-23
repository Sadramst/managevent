import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/en" || path.startsWith("/en/")) {
    const target = request.nextUrl.clone();
    target.pathname = path.replace(/^\/en/, "") || "/";
    return NextResponse.redirect(target, 308);
  }
  if (path === "/fa" || path.startsWith("/fa/")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/en${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|sitemap.xml|robots.txt|opengraph-image|hero.webp).*)"],
};
