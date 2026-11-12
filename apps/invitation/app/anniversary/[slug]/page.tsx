import type { Metadata } from "next";
import { getInvitationPublic } from "@managevent/i18n";
import { privateMetadata } from "@/lib/metadata";
import { legacyPath, redirectLegacyLink } from "@/lib/public/legacy";

/**
 * An old `/anniversary/<slug>` link. The API resolves it (`guestSite.resolveLegacy`) and the
 * visitor is sent to the current guest page; anything unknown is a real 404.
 */
export const metadata: Metadata = privateMetadata(getInvitationPublic("en").legacy.metaTitle);

export default async function AnniversaryLegacyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return redirectLegacyLink(legacyPath("anniversary", [slug]));
}
