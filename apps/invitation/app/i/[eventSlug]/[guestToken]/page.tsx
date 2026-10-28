import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { GuestInvitationView } from "@/components/views/GuestInvitationView";

interface GuestPageProps {
  params: Promise<{
    eventSlug: string;
    guestToken: string;
  }>;
  searchParams: Promise<{
    lang?: string;
    opened?: string;
    muted?: string;
  }>;
}

export async function generateMetadata({ params }: GuestPageProps): Promise<Metadata> {
  const { eventSlug, guestToken } = await params;
  const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);

  if (!lookup) {
    return {
      title: "Invitation Not Found",
      robots: { index: false, follow: false, noarchive: true },
    };
  }

  const { event } = lookup;

  return {
    title: `${event.title} | Managevent Invitations`,
    description: event.content.headline || event.content.subheadline,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
    },
    openGraph: {
      title: event.title,
      description: event.content.headline || "You are warmly invited.",
      images: event.content.coverImageUrl ? [{ url: event.content.coverImageUrl }] : undefined,
    },
  };
}

export default async function GuestInvitationPage({ params, searchParams }: GuestPageProps) {
  const { eventSlug, guestToken } = await params;
  const query = await searchParams;

  const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);

  if (!lookup) {
    notFound();
  }

  const { event, party } = lookup;
  const theme = INVITATION_THEMES[event.themeId] || INVITATION_THEMES["royal-ivory"];
  const initialLocale =
    query.lang === "fa" || query.lang === "en" ? query.lang : event.defaultLanguage;

  return (
    <>
      {/* Zero-JS First Paint Fallback */}
      <noscript>
        <div
          style={{
            padding: "2rem",
            fontFamily: "serif",
            background: "#fdfbf7",
            color: "#18181b",
            textAlign: "center",
          }}
        >
          <h1>{event.title}</h1>
          <h2>{event.content.coupleOrHostNames}</h2>
          <p>{event.content.headline}</p>
          <hr style={{ margin: "1rem auto", maxWidth: "300px" }} />
          <p>
            <strong>When:</strong> {new Date(event.startsAt).toUTCString()}
          </p>
          <p>
            <strong>Where:</strong> {event.venue.name}, {event.venue.address}
          </p>
          <p>
            <em>Please enable JavaScript to view full animations, interactive RSVP, and music.</em>
          </p>
        </div>
      </noscript>

      {/* Main Interactive Guest Micro-Site */}
      <GuestInvitationView
        event={event}
        party={party}
        theme={theme}
        initialLocale={initialLocale}
      />
    </>
  );
}
