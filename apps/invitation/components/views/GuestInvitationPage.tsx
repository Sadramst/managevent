import { getInvitationGuest } from "@managevent/i18n";
import type { Metadata, Viewport } from "next";
import { loadGuestView } from "@/lib/guest/load";
import type { GuestLink } from "@/lib/guest/paths";
import { getGuestTheme } from "@/lib/guest/theme";
import { NOINDEX } from "@/lib/metadata";
import { inferCardDesignForInvitation } from "@/lib/public/card-designs";
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
export async function GuestInvitationPage({
  link,
  opened,
  cardId,
}: {
  link: GuestLink;
  opened: boolean;
  cardId?: string | undefined;
}) {
  const copy = getInvitationGuest("en");
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind === "gone") return <GuestStatus title={copy.gone.title} body={copy.gone.body} />;
  if (result.kind === "busy") return <GuestStatus title={copy.busy.title} body={copy.busy.body} />;
  return <GuestInvitation link={link} view={result.data} opened={opened} cardId={cardId} />;
}

/**
 * Metadata for a guest invitation: the event title and the hosts' cover image only. Never the
 * guest's name, and never a URL (the link is the guest's credential). Always noindex.
 */
export async function guestInvitationMetadata(
  link: GuestLink,
  cardId?: string | undefined,
): Promise<Metadata> {
  const copy = getInvitationGuest("en");
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind !== "ok") return { title: copy.meta.fallbackTitle, robots: NOINDEX };

  const { event, invitation } = result.data;
  const memorial = event.experienceMode === "MEMORIAL";
  const cardDesign =
    result.data.demo && cardId
      ? inferCardDesignForInvitation({
          cardId,
          ceremonySlug: event.ceremonySlug,
          templateSlug: invitation.templateSlug,
          themeId: invitation.themeId,
          title: event.title,
          headline: invitation.content.headline,
          subheadline: invitation.content.subheadline,
          memorial,
        })
      : undefined;
  const pageTitle = cardDesign ? cardDesign.sample.title : event.title;
  const cover = invitation.content.coverImageUrl;
  const description = copy.meta.description;
  return {
    title: pageTitle,
    description,
    robots: NOINDEX,
    openGraph: {
      type: "website",
      title: pageTitle,
      description,
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: pageTitle,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

/** The browser chrome takes the invitation's background colour. */
export async function guestInvitationViewport(
  link: GuestLink,
  cardId?: string | undefined,
): Promise<Viewport> {
  const result = await loadGuestView(link.eventSlug, link.guestToken);
  if (result.kind !== "ok") return {};
  const { event, invitation } = result.data;
  const memorial = event.experienceMode === "MEMORIAL";
  const cardDesign =
    result.data.demo && cardId
      ? inferCardDesignForInvitation({
          cardId,
          ceremonySlug: event.ceremonySlug,
          templateSlug: invitation.templateSlug,
          themeId: invitation.themeId,
          memorial,
        })
      : undefined;
  return {
    themeColor: getGuestTheme(invitation.themeId, event.experienceMode, cardDesign?.palette)
      .themeColor,
  };
}
