import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { EventModel } from "@/lib/types";
import { MapPin, Navigation, Car, Shirt, Gift, HeartHandshake } from "lucide-react";

interface VenueMapSectionProps {
  event: EventModel;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

export const VenueMapSection: React.FC<VenueMapSectionProps> = ({ event, theme, locale }) => {
  const { colors } = theme;
  const isFa = locale === "fa";
  const isMemorial = event.experienceMode === "MEMORIAL";
  const { venue, content } = event;

  const googleMapsUrl =
    venue.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${venue.name}, ${venue.address}`,
    )}`;

  const appleMapsUrl =
    venue.appleMapsUrl ||
    `https://maps.apple.com/?q=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;

  return (
    <section className="relative px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="mx-auto max-w-2xl rounded-card border p-6 sm:p-10 shadow-sm backdrop-blur-sm space-y-8"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            <MapPin className="h-5 w-5" style={{ color: colors.accent }} />
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: colors.accentInk }}
          >
            {isFa ? "محل برگزاری و نشانی" : "Venue & Details"}
          </h2>
          <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: colors.accent }} />
        </div>

        {/* Venue Location Card */}
        <div
          className="rounded-card border p-6 text-center"
          style={{
            backgroundColor: colors.bgWarm,
            borderColor: colors.rule,
          }}
        >
          <h3
            className="font-serif text-lg sm:text-xl font-bold"
            style={{ color: colors.accentInk }}
          >
            {venue.name}
          </h3>
          <p className="mt-2 text-xs sm:text-sm font-sans" style={{ color: colors.inkMuted }}>
            {venue.address}
          </p>

          {/* Navigation Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-button border px-4 py-2 text-xs font-semibold shadow-xs transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.rule,
                color: colors.accentInk,
              }}
            >
              <Navigation className="h-3.5 w-3.5" style={{ color: colors.accent }} />
              <span>Google Maps</span>
            </a>

            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-button border px-4 py-2 text-xs font-semibold shadow-xs transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.rule,
                color: colors.accentInk,
              }}
            >
              <Navigation className="h-3.5 w-3.5" style={{ color: colors.accent }} />
              <span>Apple Maps</span>
            </a>
          </div>
        </div>

        {/* Parking and Dress Code row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Parking Card */}
          <div
            className="flex items-start gap-3 rounded-button border p-4"
            style={{
              backgroundColor: colors.bgWarm,
              borderColor: colors.rule,
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <Car className="h-4 w-4" style={{ color: colors.accent }} />
            </div>
            <div>
              <div
                className="font-serif text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.accentInk }}
              >
                {isFa ? "اطلاعات پارکینگ" : "Parking Details"}
              </div>
              <p className="mt-1 text-xs" style={{ color: colors.inkMuted }}>
                {venue.parkingInfo ||
                  content.parkingInfo ||
                  (isFa ? "پارکینگ در محل موجود است." : "On-site parking available.")}
              </p>
            </div>
          </div>

          {/* Dress Code Card */}
          <div
            className="flex items-start gap-3 rounded-button border p-4"
            style={{
              backgroundColor: colors.bgWarm,
              borderColor: colors.rule,
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <Shirt className="h-4 w-4" style={{ color: colors.accent }} />
            </div>
            <div>
              <div
                className="font-serif text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.accentInk }}
              >
                {isFa ? "کد پوشش" : "Dress Code"}
              </div>
              <p className="mt-1 text-xs" style={{ color: colors.inkMuted }}>
                {venue.dressCode ||
                  content.dressCode ||
                  (isFa ? "پوشش رسمی و آراسته" : "Formal / Cocktail Attire")}
              </p>
            </div>
          </div>
        </div>

        {/* Wishing Well or Tribute Section */}
        {isMemorial && content.tributeBook ? (
          <div
            className="rounded-card border p-6 text-center"
            style={{
              backgroundColor: colors.bgWarm,
              borderColor: colors.rule,
            }}
          >
            <div
              className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <HeartHandshake className="h-4 w-4" style={{ color: colors.accent }} />
            </div>
            <h4 className="font-serif text-base font-bold" style={{ color: colors.accentInk }}>
              {isFa ? "کتاب یادبود و نیکوکاری" : "Memorial Tribute"}
            </h4>
            <p className="mt-2 text-xs sm:text-sm font-sans" style={{ color: colors.inkMuted }}>
              {content.tributeBook.prompt ||
                (isFa
                  ? "به یاد عزیز درگذشته، می‌توانید پیام همدردی ثبت نمایید."
                  : "In lieu of flowers, memorial contributions and messages are warmly appreciated.")}
            </p>
          </div>
        ) : content.wishingWell ? (
          <div
            className="rounded-card border p-6 text-center"
            style={{
              backgroundColor: colors.bgWarm,
              borderColor: colors.rule,
            }}
          >
            <div
              className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.accent}15` }}
            >
              <Gift className="h-4 w-4" style={{ color: colors.accent }} />
            </div>
            <h4 className="font-serif text-base font-bold" style={{ color: colors.accentInk }}>
              {isFa ? "صندوق آرزوها و هدایا" : "Wishing Well"}
            </h4>
            <p className="mt-2 text-xs sm:text-sm font-sans" style={{ color: colors.inkMuted }}>
              {content.wishingWell.message}
            </p>
            {content.wishingWell.payId && (
              <div
                className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-mono font-medium border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.rule,
                  color: colors.accentInk,
                }}
              >
                <span>PayID:</span>
                <span className="font-bold">{content.wishingWell.payId}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};
