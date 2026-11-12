import "server-only";

import { createApiClient, type ManageventApiClient } from "@managevent/api-client";
import { headers } from "next/headers";
import { cache } from "react";
import { clientIpFromHeaders } from "./client-ip";

/** Base URL of `apps/api` as this server reaches it. Never exposed to the browser. */
export function getApiBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
}

/**
 * The typed API client for the current request. Server components, server actions and route
 * handlers only: the browser never calls the API.
 *
 * It forwards the visitor's session cookie (so the API sees the signed-in host), their
 * user-agent and their IP address. With an address, the client also sends the shared secret
 * (`API_PROXY_SECRET`) that makes the API believe it.
 *
 * Cached per request, so every caller in one render shares one client.
 */
export const getServerApi = cache(async (): Promise<ManageventApiClient> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie") ?? undefined;
  const userAgent = incoming.get("user-agent") ?? undefined;
  const forwardedFor = clientIpFromHeaders(incoming);
  return createApiClient({
    baseUrl: getApiBaseUrl(),
    // The cookie is forwarded by hand; `credentials` means nothing on a server-side fetch.
    includeCredentials: false,
    ...(cookie ? { cookie } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(forwardedFor ? { forwardedFor } : {}),
  });
});
