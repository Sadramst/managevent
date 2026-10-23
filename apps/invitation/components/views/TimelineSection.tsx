import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { EventModel } from "@/lib/types";
import { Clock, CalendarCheck } from "lucide-react";
import { toPersianDigits } from "@/lib/i18n";

interface TimelineSectionProps {
  event: EventModel;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  event,
  theme,
  locale,
}) => {
  const { colors } = theme;
  const isFa = locale === "fa";

  return (
    <section className="relative px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="mx-auto max-w-2xl rounded-card border p-6 sm:p-10 shadow-sm backdrop-blur-sm"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            <Clock className="h-5 w-5" style={{ color: colors.accent }} />
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: colors.accentInk }}
          >
            {isFa ? "برنامه مراسم" : "Celebration Timeline"}
          </h2>
          <div
            className="mt-2 h-0.5 w-12"
            style={{ backgroundColor: colors.accent }}
          />
        </div>

        {/* Vertical Timeline container */}
        <div className="relative border-s ps-6 sm:ps-8 ms-4 sm:ms-8 space-y-8" style={{ borderColor: colors.rule }}>
          {event.schedule.map((item, idx) => {
            const displayTime = isFa ? toPersianDigits(item.time) : item.time;
            return (
              <div key={idx} className="relative group">
                {/* Node marker on the vertical rule */}
                <div
                  className="absolute -start-[31px] sm:-start-[39px] top-1.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border-2 transition-transform duration-200 group-hover:scale-125"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.accent,
                  }}
                >
                  <div
                    className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>

                {/* Content */}
                <div
                  className="rounded-button border p-4 transition-all duration-200 group-hover:shadow-sm"
                  style={{
                    backgroundColor: colors.bgWarm,
                    borderColor: colors.rule,
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="font-serif text-sm sm:text-base font-bold"
                      style={{ color: colors.accentInk }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold"
                      style={{
                        backgroundColor: `${colors.accent}15`,
                        color: colors.accentInk,
                      }}
                    >
                      {displayTime}
                    </span>
                  </div>

                  {item.description && (
                    <p
                      className="mt-2 text-xs sm:text-sm font-sans"
                      style={{ color: colors.inkMuted }}
                    >
                      {item.description}
                    </p>
                  )}

                  {item.venueName && (
                    <div
                      className="mt-2 text-xs font-medium"
                      style={{ color: colors.accent }}
                    >
                      📍 {item.venueName}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Add Link */}
        <div className="mt-8 text-center pt-6 border-t" style={{ borderColor: colors.rule }}>
          <a
            href={`/i/${event.slug}/${event.parties[0]?.token || "sample"}/calendar.ics`}
            download={`${event.slug}.ics`}
            className="inline-flex items-center justify-center gap-2 rounded-button border px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 hover:shadow-sm"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.rule,
              color: colors.accentInk,
            }}
          >
            <CalendarCheck className="h-4 w-4" style={{ color: colors.accent }} />
            <span>{isFa ? "افزودن به تقویم شخصی" : "Add to Calendar (.ics)"}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
