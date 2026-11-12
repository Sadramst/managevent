import type { Metadata } from "next";

/**
 * Robots meta for every page except `/` and `/templates`: `noindex, nofollow, noarchive`.
 * The matching HTTP header is set in `next.config.ts`; private pages need both
 * (apps/invitation/AGENTS.md).
 */
export const NOINDEX: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  noarchive: true,
  nocache: true,
};

/**
 * Metadata for a private or transactional page: a title (the root layout adds
 * " | Managevent Invitations") and the noindex robots tag.
 *
 * Guest pages: never put a guest name in the title, description or Open Graph fields.
 */
export function privateMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: NOINDEX,
  };
}
