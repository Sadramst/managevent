"use client";

import React, { useState } from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { EventModel } from "@/lib/types";
import { Image as ImageIcon, X } from "lucide-react";

interface GallerySectionProps {
  event: EventModel;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  event,
  theme,
  locale,
}) => {
  const { colors } = theme;
  const isFa = locale === "fa";
  const images = event.content.galleryImages || [];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <section className="relative px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="mx-auto max-w-3xl rounded-card border p-6 sm:p-10 shadow-sm backdrop-blur-sm"
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
            <ImageIcon className="h-5 w-5" style={{ color: colors.accent }} />
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: colors.accentInk }}
          >
            {isFa ? "گالری خاطرات" : "Memories & Moments"}
          </h2>
          <div
            className="mt-2 h-0.5 w-12"
            style={{ backgroundColor: colors.accent }}
          />
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedImage(img)}
              className="group relative aspect-4/3 overflow-hidden rounded-button border transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2"
              style={{
                borderColor: colors.rule,
                // @ts-expect-error custom ring color
                "--tw-ring-color": colors.accent,
              }}
            >
              <img
                src={img}
                alt={`Celebration moment ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center"
              >
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                  {isFa ? "بزرگنمایی" : "View"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Full size preview"
              className="max-h-[85vh] w-auto rounded-card object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform hover:scale-110"
              aria-label="Close image modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
