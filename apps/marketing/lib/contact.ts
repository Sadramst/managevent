/**
 * The public contact details, as staff last saved them in the console.
 *
 * Server-side only. `getContact()` reads `GET /v1/site-settings` through the API client, inside
 * Next's data cache: a result lives for `CONTACT_REVALIDATE_SECONDS`, and saving in the console
 * expires it at once (`CONTACT_CACHE_TAG`). If the API cannot be reached the site shows the
 * first-run defaults from the environment instead of failing: contact details are never a reason
 * for a page to break.
 */
import { createApiClient } from "@managevent/api-client";
import { DEFAULT_CONTACT_EMAIL, PublicSiteSettingsSchema } from "@managevent/validators";

export interface PublicContact {
  email: string;
  /** Empty when staff have chosen not to publish a phone number. */
  phone: string;
}

/** The Next data-cache tag the console expires after a save. */
export const CONTACT_CACHE_TAG = "site-settings";
/** Also the page-level revalidate time, so a page built while the API was down heals itself. */
export const CONTACT_REVALIDATE_SECONDS = 60;

/** What `CONTACT_EMAIL` and `CONTACT_PHONE` say, else the built-in default (no phone). */
export function fallbackContact(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PublicContact {
  return {
    email: env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL,
    phone: env.CONTACT_PHONE?.trim() ?? "",
  };
}

/** `fetch` with the data-cache hints Next understands instead of the client's `no-store`. */
const cachedFetch: typeof fetch = (input, init) => {
  const { cache: _noStore, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    next: { revalidate: CONTACT_REVALIDATE_SECONDS, tags: [CONTACT_CACHE_TAG] },
  } as RequestInit);
};

export async function getContact(): Promise<PublicContact> {
  try {
    const api = createApiClient({
      baseUrl: process.env.API_URL || "http://localhost:4000",
      includeCredentials: false,
      fetchImpl: cachedFetch,
    });
    const settings = PublicSiteSettingsSchema.parse(await api.siteSettings.getPublic());
    return { email: settings.contactEmail, phone: settings.contactPhone };
  } catch {
    return fallbackContact();
  }
}
