import type { Metadata, Viewport } from "next";
import {
  GuestInvitationPage,
  guestInvitationMetadata,
  guestInvitationViewport,
} from "@/components/views/GuestInvitationPage";

/**
 * The guest micro-site: what an invited household sees at their private link.
 *
 * The link is the credential (there is no sign-in), so this page is never cached, never indexed
 * and never logged. `proxy.ts` answers a link the host has turned off with 410 before this
 * renders; an unknown link is a real 404.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ eventSlug: string; guestToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return guestInvitationMetadata(await params);
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  return guestInvitationViewport(await params);
}

export default async function GuestInvitationRoute({ params, searchParams }: PageProps) {
  const [link, query] = await Promise.all([params, searchParams]);
  return <GuestInvitationPage link={link} opened={query.opened === "1"} />;
}
