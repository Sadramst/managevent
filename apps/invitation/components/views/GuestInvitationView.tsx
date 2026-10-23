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
import { Languages, QrCode } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface GuestInvitationViewProps {
  event: EventModel;
  party: GuestParty;
  theme: InvitationThemeTokens;
  initialLocale: "en" | "fa";
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

  // URL state for language, gate, and mute
  const langParam = searchParams.get("lang");
  const locale: "en" | "fa" = langParam === "fa" || langParam === "en" ? langParam : initialLocale;
  const isGateOpenParam = searchParams.get("opened") === "1";

  const [isGateOpen, setIsGateOpen] = useState(isGateOpenParam);
  const [currentMode, setCurrentMode] = useState<ViewMode>("story");

  const { colors } = theme;
  const isFa = locale === "fa";
  const hasGallery = Boolean(event.content.galleryImages && event.content.galleryImages.length > 0);

  const handleOpenGate = () => {
    setIsGateOpen(true);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("opened", "1");
    const search = current.toString();
    router.replace(`${pathname}?${search}`, { scroll: false });
  };

  const handleLanguageToggle = () => {
    const nextLang = locale === "fa" ? "en" : "fa";
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("lang", nextLang);
    const search = current.toString();
    router.replace(`${pathname}?${search}`, { scroll: false });
  };

  return (
    <div
      dir={isFa ? "rtl" : "ltr"}
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
        experienceMode={event.experienceMode}
        isOpenedDefault={isGateOpen}
        onOpen={handleOpenGate}
      >
        {/* Floating Top Bar for Language Toggle & Digital Pass */}
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
            <span>{isFa ? "کارت ورود دیجیتال" : "Entry Pass"}</span>
          </a>

          {/* Language Switcher */}
          {event.languages.length > 1 && (
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur-md transition-all hover:scale-105"
              style={{
                backgroundColor: `${colors.surface}E6`,
                borderColor: colors.rule,
                color: colors.accentInk,
              }}
            >
              <Languages className="h-3.5 w-3.5" style={{ color: colors.accent }} />
              <span>{isFa ? "English" : "فارسی"}</span>
            </button>
          )}
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
            experienceMode={event.experienceMode}
            locale={locale}
          />

          {/* Segmented View Mode Tab Switcher */}
          <ViewModeSelector
            currentMode={currentMode}
            onChange={(mode) => setCurrentMode(mode)}
            theme={theme}
            locale={locale}
            hasGallery={hasGallery}
          />

          {/* Dynamic View Section */}
          {currentMode === "story" && (
            <StorySection event={event} theme={theme} locale={locale} />
          )}

          {currentMode === "timeline" && (
            <TimelineSection event={event} theme={theme} locale={locale} />
          )}

          {currentMode === "gallery" && (
            <GallerySection event={event} theme={theme} locale={locale} />
          )}

          {/* Venue, Maps & Dress Code */}
          <VenueMapSection event={event} theme={theme} locale={locale} />

          {/* RSVP Form Drawer */}
          <RsvpDrawer event={event} party={party} theme={theme} locale={locale} />
        </main>

        {/* Audio Player */}
        <AudioPlayer
          audioUrl={event.content.audioUrl}
          audioTitle={event.content.audioTitle}
          theme={theme}
          locale={locale}
        />

        {/* Subtle Footer */}
        <footer className="border-t py-8 text-center text-xs opacity-60" style={{ borderColor: colors.rule }}>
          <p>
            {event.title} • {isFa ? "مدیریت رویداد با منیج‌ونت" : "Ceremony curated by Managevent"}
          </p>
        </footer>
      </GateReveal>
    </div>
  );
};
