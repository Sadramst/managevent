/**
 * The same-origin auth proxy (`app/api/auth/[...all]/route.ts`): `/api/auth/*` here →
 * `/api/auth/*` on the API, for the staff console's sign-in only.
 *
 * The browser talks to Better Auth through this site, so the session cookie is set on this
 * origin. `Origin` and `Referer` MUST reach the API: Better Auth's CSRF check passes silently
 * when the origin is empty, so dropping them would switch the check off.
 *
 * What it must never do, and does not:
 * - forward anything but the three calls the sign-in form makes (`ALLOWED_AUTH_POSTS`). Better
 *   Auth also serves `get-session`, `list-sessions`, `sign-up/email` and others; `get-session`
 *   returns the session token as JSON, which would hand a script on this origin the credential
 *   the `HttpOnly` cookie exists to keep from it. Everything else answers 404;
 * - read a large body: the sign-in bodies are under 1 KB, so anything over `MAX_BODY_BYTES` is
 *   refused before it is buffered or sent on;
 * - forward the browser's `authorization` header (the console never sends one);
 * - relay CORS headers. The API answers its trusted origins with `Access-Control-Allow-Origin`
 *   and `Allow-Credentials`; copied onto this response they would let a sibling site read it;
 * - return the session token: it is removed from JSON bodies and the `set-auth-token` header is
 *   dropped. The cookie already carries the session.
 *
 * Bodies and cookies are never logged.
 */
import { clientIpFromHeaders } from "./client-ip";

/** Request headers passed to the API as they arrived. Nothing else is forwarded. */
const FORWARDED_REQUEST_HEADERS = [
  "cookie",
  "content-type",
  "origin",
  "referer",
  "user-agent",
  "accept",
] as const;

/**
 * Upstream headers that must not be copied onto our response: hop-by-hop or re-computed ones,
 * `set-cookie` (appended one by one, because `Headers` folds them otherwise), the bearer
 * plugin's copy of the session token, and `vary` (it only says `Origin`, for the CORS headers
 * that are dropped; nothing here is cached).
 */
const DROPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
  "set-auth-token",
  "vary",
]);

/** CORS response headers. This proxy is for same-origin calls only, so they are never relayed. */
const DROPPED_RESPONSE_PREFIX = "access-control-";

/** The only API mount this proxy forwards to. */
const AUTH_PATH_PREFIX = "/api/auth/";

/**
 * The calls `components/admin-sign-in-form.tsx` makes: email and password, the authenticator
 * code, and signing a non-staff account straight back out. All are POSTs.
 */
export const ALLOWED_AUTH_POSTS: ReadonlySet<string> = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/two-factor/verify-totp",
  "/api/auth/sign-out",
]);

/** Sign-in bodies are a few hundred bytes. */
export const MAX_BODY_BYTES = 16 * 1024;

export const PROXY_SECRET_HEADER = "x-managevent-proxy-secret";

const NO_STORE = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

/**
 * The headers for the upstream request. `x-forwarded-for` is the address this server resolved,
 * never the caller's own header, and the shared secret goes with it so the API believes it.
 */
export function buildUpstreamHeaders(incoming: Headers, proxySecret: string | undefined): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = clientIpFromHeaders(incoming);
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
    const secret = proxySecret?.trim();
    if (secret) headers.set(PROXY_SECRET_HEADER, secret);
  }
  return headers;
}

/**
 * The headers for our response: everything the API sent except the dropped ones, with every
 * `Set-Cookie` appended as its own header (session, `two_factor`, `dont_remember`, ...), and
 * never cacheable.
 */
export function buildDownstreamHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  upstream.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (DROPPED_RESPONSE_HEADERS.has(lower) || lower.startsWith(DROPPED_RESPONSE_PREFIX)) return;
    headers.set(name, value);
  });
  for (const cookie of upstream.getSetCookie()) headers.append("set-cookie", cookie);
  for (const [name, value] of Object.entries(NO_STORE)) headers.set(name, value);
  return headers;
}

/**
 * The API URL for an incoming proxy URL: same path and query, on the API origin. Null when the
 * path is not strictly inside the API's auth mount, so this route can never be used to reach
 * another API route (`/v1/...`) carrying this server's proxy secret.
 *
 * `new URL()` already resolves `.`, `..` and their `%2e` spellings, so a path that climbs out no
 * longer starts with the prefix. Encoded slashes and backslashes are refused as well: no auth
 * endpoint contains one, and a server that decoded them would see a different path than we do.
 */
export function upstreamUrl(apiUrl: string, requestUrl: string): string | null {
  const { pathname, search } = new URL(requestUrl);
  if (!pathname.startsWith(AUTH_PATH_PREFIX)) return null;
  if (/%2f|%5c|\\|\/\/|\/\.{1,2}(?:\/|$)/i.test(pathname)) return null;
  return `${apiUrl.replace(/\/+$/, "")}${pathname}${search}`;
}

/** True only for the exact endpoints the staff console uses, with the method it uses. */
export function isAllowedAuthCall(method: string, requestUrl: string): boolean {
  return method === "POST" && ALLOWED_AUTH_POSTS.has(new URL(requestUrl).pathname);
}

function isJson(contentType: string | null): boolean {
  return (contentType ?? "").split(";")[0]?.trim().toLowerCase() === "application/json";
}

/**
 * Reads the request body, giving up as soon as it passes `MAX_BODY_BYTES`. `Content-Length` is
 * checked first so an honest oversized request is refused without reading a byte; the count
 * while reading covers a missing or untrue header.
 */
export async function readCappedBody(request: Request): Promise<ArrayBuffer | "too-large"> {
  const declared = request.headers.get("content-length");
  if (declared !== null && !(Number(declared) <= MAX_BODY_BYTES)) return "too-large";
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return "too-large";
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

/**
 * The upstream JSON body without the session token. Sign-in and the two-factor step answer
 * `{ token, user }`; that token works as `Authorization: Bearer` against the API, and the
 * browser has no use for it. Anything that is not a JSON object is returned unchanged.
 */
export function withoutSessionToken(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return text;
  const body = { ...(parsed as Record<string, unknown>) };
  delete body.token;
  const session = body.session;
  if (typeof session === "object" && session !== null && !Array.isArray(session)) {
    const rest = { ...(session as Record<string, unknown>) };
    delete rest.token;
    body.session = rest;
  }
  return JSON.stringify(body);
}

function problem(status: number, code: string, message: string): Response {
  return Response.json({ code, message }, { status, headers: NO_STORE });
}

export interface AuthProxyOptions {
  /** Server-side base URL of the API (`API_URL`). */
  apiUrl: string;
  /** `API_PROXY_SECRET`, shared with the API. */
  proxySecret: string | undefined;
}

/** Handles one request to `/api/auth/*` on this site. */
export async function proxyAuthRequest(
  request: Request,
  options: AuthProxyOptions,
): Promise<Response> {
  const target = upstreamUrl(options.apiUrl, request.url);
  // Not one of the console's auth calls: nothing is forwarded.
  if (!target || !isAllowedAuthCall(request.method, request.url)) {
    return problem(404, "NOT_FOUND", "Not found");
  }
  if (!isJson(request.headers.get("content-type"))) {
    return problem(415, "VALIDATION_ERROR", "Send JSON (content-type: application/json)");
  }
  const body = await readCappedBody(request);
  if (body === "too-large") {
    return problem(413, "VALIDATION_ERROR", "The request body is too large");
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: buildUpstreamHeaders(request.headers, options.proxySecret),
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return problem(502, "NETWORK_ERROR", "The sign-in service could not be reached");
  }

  const headers = buildDownstreamHeaders(upstream.headers);
  // A 204 or 304 must not carry a body.
  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers });
  }
  if (isJson(upstream.headers.get("content-type"))) {
    return new Response(withoutSessionToken(await upstream.text()), {
      status: upstream.status,
      headers,
    });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
