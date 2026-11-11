export interface VenueRef {
  slug: string;
  name: { en: string };
}

const MAX_NAME_LENGTH = 120;

/**
 * Resolves a `venue` query value to a known venue display name.
 * Returns undefined for unknown, empty or array values. Output is plain text, trimmed and capped.
 */
export function resolveVenueName(
  value: string | string[] | null | undefined,
  venues: readonly VenueRef[],
): string | undefined {
  if (typeof value !== "string") return undefined;
  const slug = value.trim();
  if (!slug) return undefined;
  const match = venues.find((venue) => venue.slug === slug);
  const name = match?.name.en.trim().slice(0, MAX_NAME_LENGTH);
  return name || undefined;
}
