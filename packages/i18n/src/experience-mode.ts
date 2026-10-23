/**
 * Canonical `getExperienceMode()` helper per `docs/design/MEMORIAL_MODE.md`.
 *
 * Never hand-roll the memorial check in apps; always call `getExperienceMode()`.
 */
import type { CeremonyFamily, ExperienceMode } from "@managevent/types";

/**
 * Ceremony slugs that unconditionally trigger Memorial Mode.
 */
export const MEMORIAL_CEREMONY_SLUGS = [
  "funeral-coordination",
  "memorial-service",
  "celebration-of-life",
  "wake",
  "wake-catering",
] as const;

const MEMORIAL_SLUG_SET = new Set<string>(MEMORIAL_CEREMONY_SLUGS);

export type ExperienceModeInput =
  | string
  | {
      ceremonySlug?: string | null | undefined;
      family?: CeremonyFamily | null | undefined;
      experienceMode?: ExperienceMode | null | undefined;
    }
  | null
  | undefined;

/**
 * Determines whether an event, route or ceremony renders in `"MEMORIAL"` or `"CELEBRATION"` mode.
 *
 * @param input - A ceremony slug, route path, or object with `{ ceremonySlug, family, experienceMode }`.
 * @returns `"MEMORIAL"` for solemn ceremonies/routes, `"CELEBRATION"` otherwise.
 */
export function getExperienceMode(input: ExperienceModeInput): ExperienceMode {
  if (!input) {
    return "CELEBRATION";
  }

  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (normalized === "memorial" || normalized === "solemn") {
      return "MEMORIAL";
    }
    if (MEMORIAL_SLUG_SET.has(normalized)) {
      return "MEMORIAL";
    }
    if (normalized.startsWith("/memorials") || normalized.includes("/memorials/")) {
      return "MEMORIAL";
    }
    for (const slug of MEMORIAL_CEREMONY_SLUGS) {
      if (normalized.endsWith(`/${slug}`) || normalized.includes(`/${slug}/`)) {
        return "MEMORIAL";
      }
    }
    return "CELEBRATION";
  }

  if (input.experienceMode === "MEMORIAL" || input.family === "SOLEMN") {
    return "MEMORIAL";
  }

  if (input.ceremonySlug && MEMORIAL_SLUG_SET.has(input.ceremonySlug.trim().toLowerCase())) {
    return "MEMORIAL";
  }

  return "CELEBRATION";
}
