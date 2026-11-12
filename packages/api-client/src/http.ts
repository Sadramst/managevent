/**
 * The HTTP layer shared by every resource: headers, query strings, the unified error model and
 * response validation. Resource files stay thin (path + schema) on top of it.
 */
import { ApiErrorSchema } from "@managevent/validators";
import type { z } from "zod";

type ApiErrorBody = z.infer<typeof ApiErrorSchema>["error"];

/**
 * Error thrown by `ManageventApiClient` when the API returns a non-2xx response, or when the
 * request never reached it (`status: 0`, `code: "NETWORK_ERROR"`).
 */
export class ManageventApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string;
  public readonly details?: unknown;

  constructor(status: number, apiError: ApiErrorBody) {
    super(apiError.message);
    this.name = "ManageventApiClientError";
    this.status = status;
    this.code = apiError.code;
    this.requestId = apiError.requestId;
    this.details = apiError.details;
  }
}

/**
 * Narrows an unknown error to an API error, optionally with a specific code:
 * `if (isApiError(err, "NOT_FOUND")) notFound();`
 */
export function isApiError(err: unknown, code?: string): err is ManageventApiClientError {
  return err instanceof ManageventApiClientError && (code === undefined || err.code === code);
}

export interface ApiClientOptions {
  /** Base URL of `apps/api` (defaults to `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`). */
  baseUrl?: string;
  /** Optional bearer token for mobile, desktop or server-to-server requests. */
  bearerToken?: string;
  /** Whether to include cross-subdomain SSO cookies (default: `true`). */
  includeCredentials?: boolean;
  /** Custom `fetch` implementation (useful for Hono `app.request` in tests). */
  fetchImpl?: typeof fetch;
  /** Default headers attached to every request. */
  defaultHeaders?: Record<string, string>;
  /** Incoming `cookie` header to forward (server components and server actions). */
  cookie?: string;
  /**
   * Client IP to forward as `x-forwarded-for`, so rate limits apply per visitor. The API only
   * believes it on a request that also carries `proxySecret`.
   */
  forwardedFor?: string;
  /**
   * The secret shared between our web servers and the API (`API_PROXY_SECRET`), sent as
   * `x-managevent-proxy-secret`. Server-side only: never pass it to a client created in the
   * browser. Defaults to `process.env.API_PROXY_SECRET` whenever `forwardedFor` is given, so a
   * server component that forwards the visitor's address is believed without further wiring.
   */
  proxySecret?: string;
  /** Incoming `user-agent` to forward. */
  userAgent?: string;
}

export interface RequestOptions {
  /** Sent as the `Idempotency-Key` header. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type QueryParams = Record<string, string | number | boolean | undefined>;

/** A response schema. The input side is left open so schemas with defaults or refinements fit. */
export type ResponseSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

export interface HttpClient {
  /** Sends a request and validates the JSON response with `schema`. */
  json<T>(p: {
    method: HttpMethod;
    path: string;
    query?: QueryParams;
    body?: unknown;
    schema: ResponseSchema<T>;
    options?: RequestOptions;
  }): Promise<T>;
  /** Sends a request whose success response has no body (204). */
  void(p: {
    method: HttpMethod;
    path: string;
    body?: unknown;
    options?: RequestOptions;
  }): Promise<void>;
  /** Fetches a non-JSON document (CSV export). `filename` comes from `Content-Disposition`. */
  text(p: {
    method: "GET";
    path: string;
    query?: QueryParams;
    options?: RequestOptions;
  }): Promise<{ body: string; contentType: string; filename: string | null }>;
}

const UNKNOWN_REQUEST_ID = "req_unknown";

function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  if (!query) return `${baseUrl}${path}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
}

/** Reads `filename="..."` or `filename*=UTF-8''...` from a `Content-Disposition` header. */
function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(contentDisposition);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      return extended[1].trim();
    }
  }
  const quoted = /filename\s*=\s*"([^"]*)"/.exec(contentDisposition);
  if (quoted?.[1]) return quoted[1];
  const bare = /filename\s*=\s*([^;]+)/.exec(contentDisposition);
  return bare?.[1]?.trim() ?? null;
}

/** Path builder that URL-encodes ids, slugs and tokens: apiPath`/v1/events/${eventId}`. */
export function apiPath(strings: TemplateStringsArray, ...values: string[]): string {
  let result = strings[0] ?? "";
  values.forEach((value, index) => {
    result += encodeURIComponent(value) + (strings[index + 1] ?? "");
  });
  return result;
}

export function createHttpClient(options: ApiClientOptions = {}): HttpClient {
  const baseUrl = (
    options.baseUrl ??
    (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_API_URL : undefined) ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
  const includeCredentials = options.includeCredentials ?? true;
  const fetchImpl = options.fetchImpl ?? fetch;

  const baseHeaders: Record<string, string> = { ...(options.defaultHeaders ?? {}) };
  if (options.cookie) baseHeaders.cookie = options.cookie;
  if (options.forwardedFor) {
    baseHeaders["x-forwarded-for"] = options.forwardedFor;
    const proxySecret =
      options.proxySecret ??
      (typeof process !== "undefined" ? process.env?.API_PROXY_SECRET : undefined);
    if (proxySecret) baseHeaders["x-managevent-proxy-secret"] = proxySecret;
  }
  if (options.userAgent) baseHeaders["user-agent"] = options.userAgent;

  async function send(p: {
    method: HttpMethod;
    path: string;
    query?: QueryParams;
    body?: unknown;
    accept: string;
    options?: RequestOptions;
  }): Promise<Response> {
    const headers: Record<string, string> = {
      accept: p.accept,
      ...baseHeaders,
      ...(p.options?.headers ?? {}),
    };
    if (options.bearerToken) headers.authorization = `Bearer ${options.bearerToken}`;
    if (p.options?.idempotencyKey) headers["idempotency-key"] = p.options.idempotencyKey;
    if (p.body !== undefined) headers["content-type"] = "application/json";

    // `cache` is part of the Fetch standard (and what stops Next.js caching API reads) but is
    // missing from the Node typings, hence the widened type.
    const init: RequestInit & { cache: "no-store" } = {
      method: p.method,
      headers,
      cache: "no-store",
      ...(includeCredentials ? { credentials: "include" as const } : {}),
      ...(p.body !== undefined ? { body: JSON.stringify(p.body) } : {}),
      ...(p.options?.signal ? { signal: p.options.signal } : {}),
    };

    let res: Response;
    try {
      res = await fetchImpl(buildUrl(baseUrl, p.path, p.query), init);
    } catch (cause) {
      // An abort is the caller's own decision, not a network failure.
      if (p.options?.signal?.aborted) throw cause;
      throw new ManageventApiClientError(0, {
        code: "NETWORK_ERROR",
        message: "Could not reach the Managevent API",
        requestId: UNKNOWN_REQUEST_ID,
      });
    }

    if (res.ok) return res;

    const requestId = res.headers.get("x-request-id") ?? UNKNOWN_REQUEST_ID;
    let parsed: unknown;
    try {
      const text = await res.text();
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    const apiError = ApiErrorSchema.safeParse(parsed);
    if (apiError.success) {
      throw new ManageventApiClientError(res.status, apiError.data.error);
    }
    throw new ManageventApiClientError(res.status, {
      code: `HTTP_${res.status}`,
      message: `API request failed with status ${res.status}`,
      requestId,
    });
  }

  return {
    async json(p) {
      const res = await send({ ...p, accept: "application/json" });
      const text = await res.text();
      let json: unknown;
      try {
        json = text.length > 0 ? JSON.parse(text) : undefined;
      } catch {
        throw new ManageventApiClientError(res.status, {
          code: `HTTP_${res.status}`,
          message: "API returned a non-JSON response",
          requestId: res.headers.get("x-request-id") ?? UNKNOWN_REQUEST_ID,
        });
      }
      return p.schema.parse(json);
    },

    async void(p) {
      await send({ ...p, accept: "application/json" });
    },

    async text(p) {
      const res = await send({ ...p, accept: "text/csv, text/plain, */*" });
      // `res.text()` strips a leading byte order mark. A CSV export needs it (Excel reads the
      // file as UTF-8 only when it is there), so the bytes are decoded as they were sent.
      const body = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer());
      return {
        body,
        contentType: res.headers.get("content-type") ?? "",
        filename: parseFilename(res.headers.get("content-disposition")),
      };
    },
  };
}
