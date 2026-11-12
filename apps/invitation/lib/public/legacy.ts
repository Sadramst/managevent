import "server-only";

import { isApiError } from "@managevent/api-client";
import { notFound, redirect } from "next/navigation";
import { getServerApi } from "@/lib/server-api";
import { samplePath } from "./links";
import { legacyPath } from "./legacy-path";

export { legacyPath };

/**
 * Sends an old invitation link (from the two earlier invitation sites) to the guest page it
 * stands for. The API owns the mapping (`POST /v1/public/legacy/resolve`); an unknown path is a
 * real 404, with nothing to say whether a link ever existed.
 *
 * The old path and the link it resolves to are credentials: neither is logged.
 */
export async function redirectLegacyLink(path: string): Promise<never> {
  // The API accepts 1 to 300 characters; anything else cannot be a link we imported.
  if (path.length < 2 || path.length > 300) notFound();
  const api = await getServerApi();
  let target: string;
  try {
    target = samplePath(await api.guestSite.resolveLegacy(path));
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    throw err;
  }
  redirect(target);
}
