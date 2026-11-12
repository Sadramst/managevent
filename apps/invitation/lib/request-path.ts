/**
 * The request header in which `proxy.ts` records the path being requested (`/studio/...` and
 * `/check-in/...` only), so server layouts can build a `?next=` for the sign-in redirect.
 */
export const REQUEST_PATH_HEADER = "x-managevent-request-path";
