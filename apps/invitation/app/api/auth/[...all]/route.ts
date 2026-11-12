/**
 * Same-origin proxy for the browser's Better Auth calls: `/api/auth/*` here → `/api/auth/*` on
 * the API (CONTRACT section D).
 *
 * Why a proxy: the session cookie must be set by a response the browser receives from THIS
 * origin. A server action calling the API would receive the `Set-Cookie` on the Next server
 * and the browser would never be signed in.
 *
 * What it must do, and does:
 * - forward `Origin` and `Referer` untouched. Better Auth's CSRF check skips an empty origin, so
 *   dropping them would silently switch the check off;
 * - forward the cookie, and the visitor's IP as `x-forwarded-for` together with the shared
 *   secret (`x-managevent-proxy-secret`) that makes the API believe it, so sign-in rate limits
 *   count per visitor;
 * - pass every `Set-Cookie` through as its own header (session, `two_factor`, `dont_remember`);
 * - pass redirects through unfollowed (the magic-link and password-reset links end in a 302).
 *
 * What it must never do, and does not:
 * - forward anything but the calls the sign-in pages make (`ALLOWED_POST`, `ALLOWED_GET`).
 *   Better Auth also serves `get-session`, `list-sessions` and others that return the session
 *   token as JSON; through this proxy they would hand a script on this origin a credential the
 *   `HttpOnly` cookie exists to keep from it. Everything else answers 404;
 * - emit CORS headers. The API answers its trusted origins with `Access-Control-Allow-Origin`
 *   and `Allow-Credentials`; copied onto this response they would let a sibling site read it;
 * - return the session token: it is removed from JSON bodies and the `set-auth-token` header
 *   is dropped. The cookie already carries the session;
 * - forward the browser's `authorization` header (the pages never send one);
 * - read a large body: sign-in bodies are under 1 KB, so anything over `MAX_BODY_BYTES` is
 *   refused before it is buffered or sent on.
 *
 * Bodies and cookies are never logged.
 */
import type { NextRequest } from "next/server";
import { clientIpFromHeaders } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "/api/auth";

/** The calls `lib/auth-client.ts` makes. Anything else under `/api/auth/` is not forwarded. */
const ALLOWED_POST: ReadonlySet<string> = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/sign-in/magic-link",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/forget-password",
  "/reset-password",
  "/sign-out",
]);

/** The links in sign-in and password-reset emails. Both end in a redirect back to a page. */
const ALLOWED_GET: readonly RegExp[] = [
  /^\/magic-link\/verify$/,
  /^\/reset-password\/[A-Za-z0-9._~-]{1,256}$/,
];

/** Sign-in, sign-up and reset bodies are a few hundred bytes. */
const MAX_BODY_BYTES = 16 * 1024;

/** Where a failed emailed link lands: the sign-in page, with a message it knows how to show. */
const LINK_FAILED_PATH = "/sign-in?error=link";

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
 * `set-cookie` (appended one by one below), the bearer plugin's copy of the session token, and
 * `vary` (it only says `Origin`, for the CORS headers that are dropped; nothing here is cached).
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

function isDroppedResponseHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return DROPPED_RESPONSE_HEADERS.has(lower) || lower.startsWith("access-control-");
}

function apiBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
}

function problem(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, requestId: "req_unknown" } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

const notFound = () =>
  new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

function isAllowed(method: string, path: string): boolean {
  if (method === "POST") return ALLOWED_POST.has(path);
  if (method === "GET") return ALLOWED_GET.some((pattern) => pattern.test(path));
  return false;
}

function isJson(contentType: string | null): boolean {
  return (contentType ?? "").split(";")[0]?.trim().toLowerCase() === "application/json";
}

/**
 * Reads the request body, giving up as soon as it passes `MAX_BODY_BYTES`. `Content-Length` is
 * checked first so an honest oversized request is refused without reading a byte; the count
 * while reading covers a missing or untrue header.
 */
async function readBody(request: NextRequest): Promise<ArrayBuffer | "too-large"> {
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
 * The upstream JSON body without the session token. Sign-in, sign-up and the two-step calls
 * answer `{ token, user }`; that token works as `Authorization: Bearer` against the API, and
 * the browser has no use for it. Anything that is not a JSON object is returned unchanged.
 */
function withoutSessionToken(text: string): string {
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

/** True when a redirect points at Better Auth's own error page (unbranded, text from the URL). */
function pointsAtAuthErrorPage(location: string): boolean {
  try {
    return new URL(location, "http://placeholder.invalid").pathname === `${PREFIX}/error`;
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, method: "GET" | "POST"): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  // The route only matches /api/auth/*; the exact-path allowlist also covers a rewritten or
  // encoded path, since nothing but these literal paths is ever sent on.
  if (!pathname.startsWith(`${PREFIX}/`)) return notFound();
  const path = pathname.slice(PREFIX.length);
  if (!isAllowed(method, path)) return notFound();

  let body: ArrayBuffer | undefined;
  if (method === "POST") {
    if (!isJson(request.headers.get("content-type"))) {
      return problem(415, "VALIDATION_ERROR", "Send JSON (content-type: application/json)");
    }
    const read = await readBody(request);
    if (read === "too-large") {
      return problem(413, "VALIDATION_ERROR", "The request body is too large");
    }
    body = read;
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = clientIpFromHeaders(request.headers);
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  const proxySecret = process.env.API_PROXY_SECRET;
  if (proxySecret) headers.set("x-managevent-proxy-secret", proxySecret);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}${pathname}${search}`, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return problem(502, "NETWORK_ERROR", "Could not reach the Managevent API");
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!isDroppedResponseHeader(name)) responseHeaders.set(name, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  responseHeaders.set("cache-control", "no-store");

  const location = upstream.headers.get("location");
  if (location && pointsAtAuthErrorPage(location)) {
    responseHeaders.set("location", LINK_FAILED_PATH);
  }

  // 204 and 304 responses must not carry a body.
  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers: responseHeaders });
  }
  if (isJson(upstream.headers.get("content-type"))) {
    return new Response(withoutSessionToken(await upstream.text()), {
      status: upstream.status,
      headers: responseHeaders,
    });
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: NextRequest): Promise<Response> {
  return proxy(request, "GET");
}

export async function POST(request: NextRequest): Promise<Response> {
  return proxy(request, "POST");
}
