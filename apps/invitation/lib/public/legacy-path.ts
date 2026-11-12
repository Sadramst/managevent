/** A path segment as the visitor typed it; a malformed escape is left as it is. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Rebuilds the path of an old link from its route segments: `/anniversary/<slug>`,
 * `/e/<event>/<guest>` or `/legacy/...`. The API matches it against the imported paths.
 */
export function legacyPath(prefix: string, segments: readonly string[]): string {
  return `/${[prefix, ...segments.map(decodeSegment)].join("/")}`;
}
