import { getSitePages } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";

export interface PerthSetting {
  /** The content slug, kept so "ask about this setting" links prefill the enquiry form. */
  slug: string;
  name: string;
  area: string;
  kind: string;
  body: string;
}

/**
 * Turns the placeholder venue records in `content/locations/perth/venues.json` into honest
 * "settings we work in" cards. Only records with reviewed copy are shown, so a placeholder
 * name, a "TBC" label or an unverified capacity can never reach the page.
 */
export function perthSettings(
  locale: EnabledLocale,
  venues: readonly { slug: string }[],
): PerthSetting[] {
  const copy: Record<string, Omit<PerthSetting, "slug">> = getSitePages(locale).home.settings;
  const seen = new Set<string>();
  const settings: PerthSetting[] = [];
  for (const venue of venues) {
    const key = venue.slug.replace(/-placeholder$/, "");
    const entry = copy[key];
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    settings.push({ slug: venue.slug, ...entry });
  }
  return settings;
}
