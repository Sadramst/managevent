import { loadCeremonies } from "../content";

let cached: Readonly<Record<string, string>> | undefined;

/**
 * Occasion names by slug, from `/content/ceremonies`, for showing an enquiry's occasion the way
 * the public site names it. Read once per server process. If the content folder cannot be read
 * the console still works: `ceremonyLabel()` falls back to the slug in words.
 */
export function loadCeremonyNames(): Readonly<Record<string, string>> {
  if (cached) return cached;
  try {
    cached = Object.fromEntries(
      loadCeremonies().map((ceremony) => [ceremony.slug, ceremony.name.en]),
    );
  } catch {
    cached = {};
  }
  return cached;
}
