import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import { formatCeremonyDate } from "@/lib/i18n";
import type { EventModel } from "@/lib/types";
import { ArchDecoration } from "../invitation/ArchDecoration";
import { VectorFlorals } from "../invitation/VectorFlorals";
import { Sparkles, Calendar, MapPin } from "lucide-react";

interface HeroSectionProps {
  event: EventModel;
  theme: InvitationThemeTokens;
  greetingName: string;
  locale: "en" | "fa";
}

export const HeroSection: React.FC<HeroSectionProps> = ({ event, theme, greetingName, locale }) => {
  const isMemorial = event.experienceMode === "MEMORIAL";
  const { colors } = theme;

  const formattedDate = formatCeremonyDate(event.startsAt, locale, {
    includeTime: true,
    includeWeekday: true,
  });

  return (
    <div className="relative overflow-hidden px-4 pt-12 pb-8 sm:px-8 sm:pt-16 sm:pb-12 text-center">
      <ArchDecoration theme={theme} />
      <VectorFlorals theme={theme} position="both" />

      {/* Guest Personalized Greeting Banner */}
      <div
        className="relative z-10 mx-auto mb-6 inline-flex max-w-sm items-center justify-center gap-2 rounded-chip border px-4 py-1.5 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: `${colors.bgWarm}E6`,
          borderColor: colors.rule,
        }}
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: colors.accent }} />
        <span
          className="font-serif text-xs font-semibold tracking-wide"
          style={{ color: colors.accentInk }}
        >
          {locale === "fa" ? `${greetingName} عزیز` : `Dear ${greetingName}`}
        </span>
      </div>

      {/* Couple or Honouree Headline */}
      <h1
        className="relative z-10 mx-auto max-w-xl font-display text-3xl font-bold tracking-tight sm:text-5xl"
        style={{ color: colors.accentInk }}
      >
        {event.content.coupleOrHostNames}
      </h1>

      {/* Event Subheadline */}
      <p
        className="relative z-10 mx-auto mt-4 max-w-md font-serif text-base italic sm:text-lg"
        style={{ color: colors.inkMuted }}
      >
        {event.content.headline}
      </p>

      {/* Ceremony Details Strip */}
      <div
        className="relative z-10 mx-auto mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium sm:gap-6 sm:text-sm"
        style={{ color: colors.ink }}
      >
        <div className="inline-flex items-center gap-1.5">
          <Calendar className="h-4 w-4" style={{ color: colors.accent }} />
          <span>{formattedDate}</span>
        </div>

        <div className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4" style={{ color: colors.accent }} />
          <span>{event.venue.name}</span>
        </div>
      </div>
    </div>
  );
};
