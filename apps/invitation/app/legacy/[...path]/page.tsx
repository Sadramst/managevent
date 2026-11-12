import type { Metadata } from "next";
import { getInvitationPublic } from "@managevent/i18n";
import { privateMetadata } from "@/lib/metadata";
import { legacyPath, redirectLegacyLink } from "@/lib/public/legacy";

/**
 * An imported link from one of the earlier invitation sites, served under `/legacy/...`.
 * The API resolves it (`guestSite.resolveLegacy`) and the visitor is sent to the current guest
 * page; anything unknown is a real 404. Nothing is rendered here and nothing is logged.
 */
export const metadata: Metadata = privateMetadata(getInvitationPublic("en").legacy.metaTitle);

export default async function LegacyLinkPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return redirectLegacyLink(legacyPath("legacy", path));
}
