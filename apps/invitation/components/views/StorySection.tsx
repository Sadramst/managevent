import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { EventModel } from "@/lib/types";
import { Heart, Sparkles, BookOpen } from "lucide-react";

interface StorySectionProps {
  event: EventModel;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

export const StorySection: React.FC<StorySectionProps> = ({
  event,
  theme,
  locale,
}) => {
  const { colors } = theme;
  const isMemorial = event.experienceMode === "MEMORIAL";
  const { content } = event;

  return (
    <section className="relative px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="mx-auto max-w-2xl rounded-card border p-6 sm:p-10 shadow-sm backdrop-blur-sm"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            {isMemorial ? (
              <BookOpen className="h-5 w-5" style={{ color: colors.accent }} />
            ) : (
              <Heart className="h-5 w-5" style={{ color: colors.accent }} />
            )}
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: colors.accentInk }}
          >
            {locale === "fa"
              ? isMemorial
                ? "یادبود و خاطرات"
                : "داستان ما"
              : isMemorial
                ? "In Loving Memory"
                : "Our Story"}
          </h2>
          <div
            className="mt-2 h-0.5 w-12"
            style={{ backgroundColor: colors.accent }}
          />
        </div>

        {/* Narrative Paragraphs */}
        <div className="space-y-4 text-center font-serif text-base leading-relaxed sm:text-lg" style={{ color: colors.ink }}>
          {content.invitationStory && content.invitationStory.length > 0 ? (
            content.invitationStory.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))
          ) : (
            <p>{content.subheadline}</p>
          )}
        </div>

        {/* Story Pillars / Highlights */}
        {content.pillars && content.pillars.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-6 border-t" style={{ borderColor: colors.rule }}>
            {content.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="rounded-button border p-4 text-center transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: colors.bgWarm,
                  borderColor: colors.rule,
                }}
              >
                <div
                  className="font-display text-sm font-semibold tracking-wide"
                  style={{ color: colors.accentInk }}
                >
                  {pillar.title}
                </div>
                <div
                  className="mt-1 font-sans text-xs"
                  style={{ color: colors.inkMuted }}
                >
                  {pillar.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
