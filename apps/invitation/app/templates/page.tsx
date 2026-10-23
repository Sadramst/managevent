import React from "react";
import Link from "next/link";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { Sparkles, ArrowRight, ShieldCheck, Heart } from "lucide-react";

export const metadata = {
  title: "Invitation Templates & Themes",
  description:
    "Explore luxury invitation themes for Australian weddings, Persian Sofreh Aghd, anniversaries, birthdays, galas, and memorial services.",
};

export default function TemplatesPage() {
  const themes = Object.values(INVITATION_THEMES);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-950/70 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-200 hover:text-white font-serif font-bold text-lg">
            <span>Managevent Invitations</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="rounded-button border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white"
            >
              Host Studio
            </Link>
            <Link
              href="/studio/new"
              className="rounded-button bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
            >
              Create Invitation
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated Design System</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Ceremony Themes & Templates
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto font-serif">
            Each theme includes custom typography, ornamental borders, gate reveal styles, and WCAG AA contrast for an unforgettable guest experience.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => {
            const isMemorial = theme.id.startsWith("memorial-");
            const { colors } = theme;

            return (
              <div
                key={theme.id}
                className="group flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/90 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl"
              >
                <div>
                  {/* Theme Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
                      {theme.ornaments} ornament
                    </span>
                    {isMemorial ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Memorial</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Heart className="h-3 w-3" />
                        <span>Celebration</span>
                      </span>
                    )}
                  </div>

                  {/* Swatch Strip */}
                  <div className="flex h-8 w-full overflow-hidden rounded-button border border-stone-700/60 mb-5">
                    <div className="flex-1" style={{ backgroundColor: colors.surface }} title="Surface" />
                    <div className="flex-1" style={{ backgroundColor: colors.bgWarm }} title="Warm Background" />
                    <div className="flex-1" style={{ backgroundColor: colors.accent }} title="Accent" />
                    <div className="flex-1" style={{ backgroundColor: colors.accentInk }} title="Accent Ink" />
                  </div>

                  <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {theme.name}
                  </h3>

                  <p className="mt-2 text-xs text-stone-400 leading-relaxed font-sans">
                    {theme.id === "royal-ivory" &&
                      "Burnished gold accents on warm ivory, tailored for milestone wedding anniversaries and black-tie balls."}
                    {theme.id === "emerald-botanic" &&
                      "Western Australia coastal botanic greens paired with brushed metallic gold, perfect for winery and garden weddings."}
                    {theme.id === "midnight-celestial" &&
                      "Deep midnight navy luxury with celestial starlight accents and glowing champagne typography."}
                    {theme.id === "persian-azure" &&
                      "Isfahan Persian azure tiles, turquoise motifs, and gold leaf framing for Sofreh Aghd and celebrations."}
                    {theme.id === "alabaster-platinum" &&
                      "Sleek minimalist alabaster and platinum for contemporary galas and modern milestone birthdays."}
                    {theme.id === "memorial-alabaster" &&
                      "A calm, dignified alabaster palette designed for celebrations of life and memorial services with solemn grace."}
                    {theme.id === "memorial-slate" &&
                      "Understated charcoal and slate tones designed to convey sincere respect and timeless remembrance."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                  <Link
                    href={`/studio/new?theme=${theme.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                  >
                    <span>Use this template</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
