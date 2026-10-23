/**
 * @managevent/api-client
 *
 * Typed API client generated from `@managevent/api` OpenAPI 3.1 specification,
 * with cookie/bearer authentication and unified `{ error: { code, message, details?, requestId } }` error handling.
 */
import type { ApiError, HealthResponse, LeadCreateInput, LeadResponse } from "@managevent/types";
import {
  ApiErrorSchema,
  HealthResponseSchema,
  LeadCreateSchema,
  LeadResponseSchema,
} from "@managevent/validators";
import { z } from "zod";
import {
  GENERATED_API_VERSION,
  GENERATED_OPERATIONS,
  type GeneratedOperation,
} from "./generated.js";
import {
  buildGeneratedClientSource,
  type ExtractedOperation,
  extractOpenApiOperations,
} from "./generator.js";

export {
  buildGeneratedClientSource,
  type ExtractedOperation,
  extractOpenApiOperations,
  GENERATED_API_VERSION,
  GENERATED_OPERATIONS,
  type GeneratedOperation,
};

/**
 * Error thrown by `ManageventApiClient` when the API returns a non-2xx response.
 */
export class ManageventApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string;
  public readonly details?: unknown;

  constructor(status: number, apiError: ApiError["error"]) {
    super(apiError.message);
    this.name = "ManageventApiClientError";
    this.status = status;
    this.code = apiError.code;
    this.requestId = apiError.requestId;
    this.details = apiError.details;
  }
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
}

const LeadListResponseSchema = z.object({
  items: z.array(LeadResponseSchema),
});

export class ManageventApiClient {
  private readonly baseUrl: string;
  private readonly bearerToken?: string;
  private readonly includeCredentials: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:4000"
    ).replace(/\/$/, "");
    if (options.bearerToken) {
      this.bearerToken = options.bearerToken;
    }
    this.includeCredentials = options.includeCredentials ?? true;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  private async requestJson<T>(params: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
    schema: z.ZodType<T>;
  }): Promise<T> {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...this.defaultHeaders,
      ...(params.headers ?? {}),
    };

    if (this.bearerToken) {
      headers.authorization = `Bearer ${this.bearerToken}`;
    }

    if (params.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const res = await this.fetchImpl(`${this.baseUrl}${params.path}`, {
      method: params.method,
      headers,
      ...(this.includeCredentials ? { credentials: "include" as const } : {}),
      ...(params.body !== undefined ? { body: JSON.stringify(params.body) } : {}),
    });

    const json: unknown = await res.json();

    if (!res.ok) {
      const parsedErr = ApiErrorSchema.safeParse(json);
      if (parsedErr.success) {
        throw new ManageventApiClientError(res.status, parsedErr.data.error);
      }
      throw new ManageventApiClientError(res.status, {
        code: `HTTP_${res.status}`,
        message: `API request failed with status ${res.status}`,
        requestId: res.headers.get("x-request-id") ?? "req_unknown",
      });
    }

    return params.schema.parse(json);
  }

  /**
   * `GET /health`
   */
  async getHealth(): Promise<HealthResponse> {
    return this.requestJson({
      method: "GET",
      path: "/health",
      schema: HealthResponseSchema,
    });
  }

  /**
   * `POST /v1/leads`
   */
  async createLead(
    input: LeadCreateInput,
    options?: { idempotencyKey?: string },
  ): Promise<LeadResponse> {
    const validatedInput = LeadCreateSchema.parse(input);
    return this.requestJson({
      method: "POST",
      path: "/v1/leads",
      body: validatedInput,
      ...(options?.idempotencyKey
        ? { headers: { "idempotency-key": options.idempotencyKey } }
        : {}),
      schema: LeadResponseSchema,
    });
  }

  /**
   * `GET /v1/leads`
   */
  async listLeads(): Promise<{ items: LeadResponse[] }> {
    return this.requestJson({
      method: "GET",
      path: "/v1/leads",
      schema: LeadListResponseSchema,
    });
  }
}

/**
 * Factory helper to create a typed `ManageventApiClient`.
 */
export function createApiClient(options?: ApiClientOptions): ManageventApiClient {
  return new ManageventApiClient(options);
}
