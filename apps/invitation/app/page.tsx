import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Heart,
  Calendar,
  Share2,
  QrCode,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Layers,
  Utensils,
  Music,
  Camera,
  BookOpen,
  Lock,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-stone-950 text-stone-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 start-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-amber-600/15 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] end-[-10%] h-[450px] w-[450px] rounded-full bg-[#5C1A24]/20 blur-[160px] pointer-events-none" />
      <div className="absolute top-[65%] start-[-10%] h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="group flex items-center transition-transform hover:scale-[1.01]"
          >
            <BrandLogo variant="compact" subtitle="Invitations" size="md" />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/templates"
              className="text-xs sm:text-sm font-medium text-stone-300 hover:text-white transition-colors"
            >
              Themes
            </Link>
            <Link
              href="/studio"
              className="rounded-button border border-stone-800 bg-stone-900/80 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-stone-200 hover:border-amber-500/40 hover:bg-stone-800 transition-all"
            >
              Host Studio
            </Link>
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-1.5 rounded-button bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-4 py-1.5 text-xs sm:text-sm font-bold text-stone-950 shadow-lg shadow-amber-950/50 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span>Create Event</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 sm:pt-24 pb-20 text-center">
        {/* Atelier Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-inner mb-8">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="tracking-wide">High-End Australian Ceremony Invitations & RSVP</span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
          Invitations Crafted for{" "}
          <span className="bg-gradient-to-r from-[#F7E7C4] via-[#D8B365] to-[#B88934] bg-clip-text text-transparent">
            Life’s Defining Ceremonies
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl font-serif text-lg sm:text-xl text-stone-300/90 leading-relaxed">
          From animated wax-seal reveals and bespoke editorial typography to zero-friction RSVP,
          encrypted dietary tracking, and door check-in for Perth and Australian ceremonies.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/studio/new"
            className="inline-flex items-center gap-2 rounded-button bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-7 py-3.5 text-sm font-bold text-stone-950 shadow-xl shadow-amber-950/60 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span>Start Designing Your Invitation</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/i/anniversary/armita-party-g9qtmt"
            className="inline-flex items-center gap-2 rounded-button border border-stone-700/80 bg-stone-900/70 px-6 py-3.5 text-sm font-semibold text-stone-200 backdrop-blur-md hover:border-stone-500 hover:text-white transition-all"
          >
            <span>Experience Live Guest Reveal</span>
          </Link>
        </div>

        {/* Visual Brand Atelier Showcase */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="relative overflow-hidden rounded-card border border-amber-500/20 bg-gradient-to-b from-stone-900/90 to-stone-950/90 p-4 sm:p-8 shadow-2xl shadow-stone-950/80 backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-start">
              {/* Left: Brand Emblem Preview */}
              <div className="relative flex flex-col items-center justify-center p-8 rounded-panel bg-gradient-to-b from-[#2B0E14] via-[#1B070B] to-[#120406] border border-amber-500/30 shadow-2xl">
                <div className="absolute inset-0 rounded-panel bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.15)_0%,transparent_70%)] pointer-events-none" />
                <BrandLogo variant="badge" size="xl" theme="gold" className="mb-4" />
                <div className="text-center">
                  <h3 className="font-serif text-2xl font-bold tracking-widest text-[#F3E2B8] uppercase">
                    Managevent
                  </h3>
                  <p className="text-[11px] font-sans tracking-[0.25em] text-amber-300/80 uppercase mt-1">
                    Ceremonies & Atelier
                  </p>
                  <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                  <p className="mt-3 text-xs text-stone-400 max-w-xs font-serif italic">
                    “Honouring moments of love, heritage, milestone, and remembrance with timeless
                    craftsmanship.”
                  </p>
                </div>
              </div>

              {/* Right: Key Pillars */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-3.5 rounded-panel bg-stone-900/50 border border-stone-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Animated Gate Reveal</h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Personalised wax seal break, silk ribbon tear, and envelope gate reveal
                      customized to each guest.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-panel bg-stone-900/50 border border-stone-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Private Dietary & RSVP Bridge</h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Dietary allergies and headcounts flow safely to your catering and table
                      arrangements.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-panel bg-stone-900/50 border border-stone-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Australian Privacy Compliant</h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      All guest records, tokens, and RSVPs encrypted at rest in Sydney
                      (ap-southeast-2).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ceremony Types Showcase Section */}
      <section className="relative z-10 border-t border-stone-800/80 bg-stone-950/60 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Tailored for Every Ceremony
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-400 font-serif">
              Each ceremony category features dedicated typography, cultural layouts, color
              harmonies, and respectful motion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Wedding Celebration */}
            <div className="group relative flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/70 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-950/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                    Weddings & Engagements
                  </span>
                  <Heart className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  Sarah & David
                </h3>
                <p className="text-xs font-serif italic text-amber-200/70 mt-1">
                  Classic Ivory & Champagne Gold Arch
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Double arch gold framing, couple love story timeline, ceremony order of service,
                  wishing well gifts, and photo wall.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">Theme: Classic Ivory</span>
                <Link
                  href="/i/anniversary/armita-party-g9qtmt"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>Preview Demo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Cultural & Traditional Ceremonies */}
            <div className="group relative flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/70 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-950/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                    Cultural & Traditional Weddings
                  </span>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  Elena & Marcus
                </h3>
                <p className="text-xs font-serif italic text-amber-200/70 mt-1">
                  Emerald Botanic & Multi-Stage Schedule
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Multi-stage ceremony and banquet timelines, Halal and allergy-safe dietary
                  matrices, cultural blessing notes, and household group RSVPs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">Theme: Emerald Botanic</span>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 3. Milestone Anniversary */}
            <div className="group relative flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/70 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-950/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                    Milestone Anniversaries
                  </span>
                  <Calendar className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  Armita & Reza
                </h3>
                <p className="text-xs font-serif italic text-amber-200/70 mt-1">
                  Terracotta Warmth & Wax Seal
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Interactive journey through the years, photo memories slideshow, dietary
                  requirement selection, and VIP digital entry passes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">Theme: Terracotta</span>
                <Link
                  href="/i/anniversary/armita-party-g9qtmt"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>Preview Demo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 4. Corporate Galas */}
            <div className="group relative flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/70 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-950/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                    Corporate Dinners & Galas
                  </span>
                  <Layers className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  Perth Annual Gala
                </h3>
                <p className="text-xs font-serif italic text-amber-200/70 mt-1">
                  Minimalist Noir & Gold Accent
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Executive dress code guides, key speakers roster, table numbering, QR security
                  gate entry, and sponsor recognition.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">Theme: Minimalist Noir</span>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 5. Memorial Mode */}
            <div className="group relative flex flex-col justify-between rounded-card border border-stone-800 bg-stone-900/70 p-6 transition-all duration-300 hover:border-stone-500/50 hover:shadow-xl hover:shadow-stone-950/20">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-stone-700/50 border border-stone-600 px-3 py-1 text-xs font-semibold text-stone-300">
                    Memorial Mode
                  </span>
                  <Heart className="h-4 w-4 text-stone-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-stone-300 transition-colors">
                  Celebration of Life
                </h3>
                <p className="text-xs font-serif italic text-stone-400 mt-1">
                  Soft Alabaster & Warm Bronze
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Respectful plain fade reveal, quiet tone, tribute book condolences, live-stream
                  links, and no celebratory animations or upsells.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">Theme: Memorial Bronze</span>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 6. Host Studio CTA Card */}
            <div className="relative flex flex-col justify-between rounded-card border border-dashed border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-stone-900/80 to-stone-950/90 p-6">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-button bg-amber-500 text-stone-950 font-bold mb-4">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">Design Your Invitation</h3>
                <p className="mt-2 text-xs text-stone-300 leading-relaxed">
                  Use our AI wording assistant, import your guest list from CSV, and launch your
                  private invitation in minutes.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/studio/new"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 shadow-md hover:bg-amber-400 transition-colors"
                >
                  <span>Launch Event Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture Grid */}
      <section className="relative z-10 border-t border-stone-800/80 bg-stone-900/40 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for Flawless Guest & Host Experience
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-400 font-serif">
              Engineered to Australian standards for performance, security, and accessibility.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <Share2 className="h-6 w-6 text-amber-400 mb-4" />
              <h3 className="text-base font-bold text-white">WhatsApp & SMS Ready</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Smart messaging templates formatted for Australian numbers with unguessable private
                guest links.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <QrCode className="h-6 w-6 text-emerald-400 mb-4" />
              <h3 className="text-base font-bold text-white">Digital Door Pass & QR</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Guests receive personalized Apple/Google Wallet compatible QR passes for seamless
                venue check-in.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <Lock className="h-6 w-6 text-rose-400 mb-4" />
              <h3 className="text-base font-bold text-white">Zero-JS SSR Resilience</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Core event details (date, venue, ceremony schedule) render instantly without
                JavaScript on low-connectivity mobile networks.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <Camera className="h-6 w-6 text-sky-400 mb-4" />
              <h3 className="text-base font-bold text-white">Live Celebration Photo Wall</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Guests can upload event photos directly from their phone with instant Host
                moderation and projector display mode.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <Calendar className="h-6 w-6 text-purple-400 mb-4" />
              <h3 className="text-base font-bold text-white">Deterministic Calendar Sync</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                One-tap .ics downloads and Google/Apple calendar synchronization pinned to Western
                Australia (AWST) timezone.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/70 p-6">
              <Layers className="h-6 w-6 text-amber-400 mb-4" />
              <h3 className="text-base font-bold text-white">Managevent Marketplace Bridge</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Guest headcounts, adult/child ratios, and dietary allocations directly drive
                catering and table seating plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-12 px-6 text-xs text-stone-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
            <BrandLogo variant="compact" subtitle="Atelier" size="sm" />
            <span className="hidden sm:inline text-stone-700">|</span>
            <span>
              © {new Date().getFullYear()} Managevent Australia. Personal data secured in Sydney
              (ap-southeast-2).
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/templates" className="hover:text-stone-300 transition-colors">
              Themes
            </Link>
            <Link href="/studio" className="hover:text-stone-300 transition-colors">
              Host Studio
            </Link>
            <Link href="/studio/new" className="hover:text-stone-300 transition-colors">
              Create Event
            </Link>
            <span className="font-mono text-[11px] text-stone-600">
              invitation.managevent.com.au
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
