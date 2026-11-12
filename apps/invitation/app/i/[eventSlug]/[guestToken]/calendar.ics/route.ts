import { isApiError } from "@managevent/api-client";
import { getServerApi } from "@/lib/server-api";

/**
 * "Add to calendar": the event as an `.ics` download, built by the API
 * (`guestSite.getCalendar`). A plain link reaches it, so it works with JavaScript off and in
 * in-app browsers. The file carries no guest name.
 *
 * Unknown link → 404, link turned off → 410 (normally answered by `proxy.ts` first).
 * Never log the path: the token is a credential.
 */
export const dynamic = "force-dynamic";

const BASE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
} as const;

/** A header-safe file name: ASCII letters, digits, dot, dash and underscore, ending in `.ics`. */
function safeFilename(name: string): string {
  const base = name
    .replace(/\.ics$/i, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "invitation"}.ics`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventSlug: string; guestToken: string }> },
): Promise<Response> {
  const { eventSlug, guestToken } = await params;
  try {
    const api = await getServerApi();
    const calendar = await api.guestSite.getCalendar(eventSlug, guestToken);
    return new Response(calendar.ics, {
      status: 200,
      headers: {
        ...BASE_HEADERS,
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="${safeFilename(calendar.filename)}"`,
      },
    });
  } catch (err) {
    const status = isApiError(err, "LINK_REVOKED")
      ? 410
      : isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")
        ? 404
        : isApiError(err, "RATE_LIMITED")
          ? 429
          : 502;
    return new Response(null, { status, headers: BASE_HEADERS });
  }
}
