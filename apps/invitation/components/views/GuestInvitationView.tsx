"use client";

import React, { useState } from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { EventModel, GuestParty, ViewMode } from "@/lib/types";
import { GateReveal } from "@/components/gate/GateReveal";
import { HeroSection } from "@/components/views/HeroSection";
import { CountdownSection } from "@/components/views/CountdownSection";
import { ViewModeSelector } from "@/components/views/ViewModeSelector";
import { StorySection } from "@/components/views/StorySection";
import { TimelineSection } from "@/components/views/TimelineSection";
import { VenueMapSection } from "@/components/views/VenueMapSection";
import { GallerySection } from "@/components/views/GallerySection";
import { RsvpDrawer } from "@/components/rsvp/RsvpDrawer";
import { AudioPlayer } from "@/components/views/AudioPlayer";
import { getExperienceMode } from "@managevent/i18n";
import { QrCode } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface GuestInvitationViewProps {
  event: EventModel;
  party: GuestParty;
  theme: InvitationThemeTokens;
  initialLocale: "en";
}

export const GuestInvitationView: React.FC<GuestInvitationViewProps> = ({
  event,
  party,
  theme,
  initialLocale,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state for gate and mute
  const locale: "en" = initialLocale;
  const isGateOpenParam = searchParams.get("opened") === "1";

  const [isGateOpen, setIsGateOpen] = useState(isGateOpenParam);
  const [currentMode, setCurrentMode] = useState<ViewMode>("story");

  const { colors } = theme;
  const isMemorial = getExperienceMode(event) === "MEMORIAL";
  const hasGallery = Boolean(event.content.galleryImages && event.content.galleryImages.length > 0);

  const handleOpenGate = () => {
    setIsGateOpen(true);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("opened", "1");
    const search = current.toString();
    router.replace(`${pathname}?${search}`, { scroll: false });
  };

  return (
    <div
      dir="ltr"
      className="relative min-h-screen overflow-x-hidden font-sans transition-colors duration-500"
      style={{
        backgroundColor: colors.bg,
        color: colors.ink,
      }}
    >
      {/* Animated Envelope Gate Reveal wrapping page */}
      <GateReveal
        theme={theme}
        guestName={party.displayName}
        experienceMode={isMemorial ? "MEMORIAL" : "CELEBRATION"}
        isOpenedDefault={isGateOpen}
        onOpen={handleOpenGate}
      >
        {/* Floating Top Bar for Digital Pass */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-8">
          {/* Pass Link */}
          <a
            href={`/i/${event.slug}/${party.token}/pass`}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur-md transition-all hover:scale-105"
            style={{
              backgroundColor: `${colors.surface}E6`,
              borderColor: colors.rule,
              color: colors.accentInk,
            }}
          >
            <QrCode className="h-3.5 w-3.5" style={{ color: colors.accent }} />
            <span>{"Entry Pass"}</span>
          </a>
        </div>

        {/* Main Invitation Sections */}
        <main className="relative z-10 mx-auto max-w-4xl space-y-4 pb-24">
          {/* Hero Section */}
          <HeroSection
            event={event}
            theme={theme}
            greetingName={party.displayName}
            locale={locale}
          />

          {/* Live Countdown Section */}
          <CountdownSection
            targetDateISO={event.startsAt}
            theme={theme}
            experienceMode={isMemorial ? "MEMORIAL" : "CELEBRATION"}
          />

          {/* Segmented View Mode Tab Switcher */}
          <ViewModeSelector
            currentMode={currentMode}
            onChange={(mode) => setCurrentMode(mode)}
            theme={theme}
            hasGallery={hasGallery}
          />

          {/* Dynamic View Section */}
          {currentMode === "story" && <StorySection event={event} theme={theme} />}

          {currentMode === "timeline" && <TimelineSection event={event} theme={theme} />}

          {currentMode === "gallery" && <GallerySection event={event} theme={theme} />}

          {/* Venue, Maps & Dress Code */}
          <VenueMapSection event={event} theme={theme} />

          {/* RSVP Form Drawer */}
          <RsvpDrawer event={event} party={party} theme={theme} locale={locale} />
        </main>

        {/* Audio Player */}
        <AudioPlayer
          audioUrl={event.content.audioUrl}
          audioTitle={event.content.audioTitle}
          theme={theme}
        />

        {/* Subtle Footer */}
        <footer
          className="border-t py-8 text-center text-xs opacity-60"
          style={{ borderColor: colors.rule }}
        >
          <p>{isMemorial ? event.title : `${event.title} • Ceremony curated by Managevent`}</p>
        </footer>
      </GateReveal>
    </div>
  );
};
