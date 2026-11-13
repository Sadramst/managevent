/**
 * Environment-derived facts shared by the API: what this deployment can really do, which browser
 * origins it trusts, and the public URLs of the web apps.
 *
 * Everything is read at call time (not import time) so tests and the CLI can set variables first.
 */
import { isCheckoutAvailable } from "@managevent/payments";
import type { MeResponse } from "@managevent/validators";
import { isEmailConfigured } from "./email.js";

/**
 * Capabilities reported by `GET /v1/me`. A flow whose provider is not configured is reported as
 * unavailable, so the UI never offers something the API would answer with a 503.
 */
export function getCapabilities(): MeResponse["capabilities"] {
  const email = isEmailConfigured();
  return {
    emailPassword: true,
    magicLink: email,
    passwordReset: email,
    emailInvitations: email,
    stripeCheckout: isCheckoutAvailable(),
  };
}

export type PublicApp = "MARKETING" | "INVITATION" | "PORTAL" | "VENDORS" | "ADMIN";

const PUBLIC_APPS: readonly PublicApp[] = ["MARKETING", "INVITATION", "PORTAL", "VENDORS", "ADMIN"];

/** Local defaults. Marketing runs on 3100 (see its dev script), not the 3000 in older docs. */
const LOCAL_APP_URLS: Readonly<Record<PublicApp, string>> = {
  MARKETING: "http://localhost:3100",
  INVITATION: "http://localhost:3001",
  PORTAL: "http://localhost:3002",
  VENDORS: "http://localhost:3003",
  ADMIN: "http://localhost:3100/admin",
};

/** Normalises a URL to its origin (`scheme://host[:port]`), or null when it is not an http(s) URL. */
export function toOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Public base URL of a web app, without a trailing slash (`NEXT_PUBLIC_<APP>_URL`). */
export function getPublicAppUrl(app: PublicApp): string {
  const configured = process.env[`NEXT_PUBLIC_${app}_URL`]?.trim();
  return (configured || LOCAL_APP_URLS[app]).replace(/\/+$/, "");
}

/**
 * Browser origins allowed to call the API with credentials (Better Auth CSRF check, CORS and
 * `originGuard`).
 *
 * `AUTH_TRUSTED_ORIGINS` (comma separated) wins when set. Otherwise: every configured
 * `NEXT_PUBLIC_{MARKETING,INVITATION,PORTAL,VENDORS,ADMIN}_URL`, plus the two local dev origins
 * outside production.
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();
  const explicit = process.env.AUTH_TRUSTED_ORIGINS?.trim();
  if (explicit) {
    for (const entry of explicit.split(",")) {
      const origin = toOrigin(entry);
      if (origin) origins.add(origin);
    }
    return [...origins];
  }

  for (const app of PUBLIC_APPS) {
    const origin = toOrigin(process.env[`NEXT_PUBLIC_${app}_URL`]);
    if (origin) origins.add(origin);
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3100");
    origins.add("http://localhost:3001");
  }
  return [...origins];
}
