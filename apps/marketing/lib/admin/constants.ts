/**
 * Constants shared by `proxy.ts` and the console's server code. Kept free of imports so the
 * proxy bundle stays small.
 */

/** Request header set by `proxy.ts` on `/admin/*`: the path and query being asked for. */
export const ADMIN_PATH_HEADER = "x-managevent-admin-path";

/** Sent on every `/admin/*` response: staff pages are never cached or indexed. */
export const ADMIN_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
