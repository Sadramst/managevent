import { isApiError } from "@managevent/api-client";
import { errorMessage } from "@/lib/action-result";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

const NO_STORE = "private, no-store";

/** A plain-text answer for a download that could not be made (opened in the browser tab). */
function problem(status: number, code: string): Response {
  return new Response(errorMessage(code), {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_STORE,
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

/** A file name safe for a `Content-Disposition` header: no quotes, slashes or line breaks. */
function safeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.toLowerCase().endsWith(".csv") && cleaned.length > 4 ? cleaned : "guests.csv";
}

/**
 * `GET /studio/{eventId}/responses/export.csv[?includeHealth=true]`: the guest list and replies
 * as a CSV download, straight from `guestList.exportCsv` with the host's own session.
 *
 * The API already writes the byte order mark Excel needs, quotes every cell and neutralises
 * formula injection. `includeHealth=true` adds the dietary and access columns and needs
 * `health:read`: without it the API answers 403 and so does this route. Never cached.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const { eventId } = await params;
  await requireHost(routes.eventTab(eventId, "responses"));
  const includeHealth = new URL(request.url).searchParams.get("includeHealth") === "true";

  try {
    const api = await getServerApi();
    const { filename, csv } = await api.guestList.exportCsv(eventId, { includeHealth });
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${safeFilename(filename)}"`,
        "cache-control": NO_STORE,
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (err) {
    if (isApiError(err)) {
      if (err.code === "NOT_FOUND" || err.code === "VALIDATION_ERROR")
        return problem(404, "NOT_FOUND");
      if (err.status === 401) return problem(401, "UNAUTHENTICATED");
      if (err.status === 403) return problem(403, "FORBIDDEN");
      if (err.status === 429) return problem(429, "RATE_LIMITED");
      return problem(502, err.code === "NETWORK_ERROR" ? "NETWORK_ERROR" : "INTERNAL_ERROR");
    }
    throw err;
  }
}
