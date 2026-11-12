import { getInvitationGuest } from "@managevent/i18n";
import type { Metadata, Viewport } from "next";
import { loadGuestView } from "@/lib/guest/load";
import type { GuestLink } from "@/lib/guest/paths";
import { getGuestTheme } from "@/lib/guest/theme";
import { NOINDEX } from "@/lib/metadata";
import { GuestInvitation } from "./GuestInvitation";
import { GuestStatus } from "./GuestShell";

/**
 * The guest invitation for a link, ready to drop into a route: `/i/{eventSlug}/{guestToken}`
 * uses it, and so can the legacy routes once `guestSite.resolveLegacy` has given them a slug
 * and token.
 *
 *   export const generateMetadata = ({ params }) => params.then(guestInvitationMetadata);
 *   export default async function Page({ params, searchParams }) {
 *     return <GuestInvitationPage link={await params} opened={(await searchParams).opened === "1"} />;
 *   }
 *
 * An unknown link ends in `notFound()` (inside `loadGuestView`): a real 404.
 */
export async function GuestInvitationPage({ link, opened }: { link: GuestLink; opened: boolean }) {
  const copy = getInvitationGuest("en");
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind === "gone") return <GuestStatus title={copy.gone.title} body={copy.gone.body} />;
  if (result.kind === "busy") return <GuestStatus title={copy.busy.title} body={copy.busy.body} />;
  return <GuestInvitation link={link} view={result.data} opened={opened} />;
}

/**
 * Metadata for a guest invitation: the event title and the hosts' cover image only. Never the
 * guest's name, and never a URL (the link is the guest's credential). Always noindex.
 */
export async function guestInvitationMetadata(link: GuestLink): Promise<Metadata> {
  const copy = getInvitationGuest("en");
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind !== "ok") return { title: copy.meta.fallbackTitle, robots: NOINDEX };

  const { event, invitation } = result.data;
  const cover = invitation.content.coverImageUrl;
  const description = copy.meta.description;
  return {
    title: event.title,
    description,
    robots: NOINDEX,
    openGraph: {
      type: "website",
      title: event.title,
      description,
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: event.title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

/** The browser chrome takes the invitation's background colour. */
export async function guestInvitationViewport(link: GuestLink): Promise<Viewport> {
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind !== "ok") return {};
  const { event, invitation } = result.data;
  return { themeColor: getGuestTheme(invitation.themeId, event.experienceMode).themeColor };
}
