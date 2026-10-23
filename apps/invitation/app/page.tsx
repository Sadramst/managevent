import React from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-stone-900 text-stone-100">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 start-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] end-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-stone-800/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-button bg-gradient-to-br from-amber-400 to-amber-700 text-stone-950 font-serif font-black text-xl shadow-lg shadow-amber-900/30">
              M
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Managevent
              </span>
              <span className="ms-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Invitations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/templates"
              className="text-xs font-semibold text-stone-300 hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/studio"
              className="rounded-button bg-stone-800 border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 transition-colors"
            >
              Host Studio
            </Link>
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-1.5 rounded-button bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-bold text-stone-950 shadow-md shadow-amber-950/40 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <span>Create Event</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-inner mb-8">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>The Next Generation of Ceremony Invitations</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Digital Invitations Crafted with{" "}
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
            Artistry & Precision
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-serif text-lg sm:text-xl text-stone-300 leading-relaxed">
          From animated wax-seal reveals to zero-friction RSVP, privacy-safe dietary tracking, and Perth’s finest Persian & Australian ceremony themes.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/studio/new"
            className="inline-flex items-center gap-2 rounded-button bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-xl shadow-amber-900/40 hover:brightness-110 transition-all"
          >
            <span>Start Designing Your Invitation</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/i/anniversary/armita-party-g9qtmt"
            className="inline-flex items-center gap-2 rounded-button border border-stone-700 bg-stone-800/80 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:bg-stone-700 transition-all"
          >
            <span>Explore Live Demo Experience</span>
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Zero-JS First Paint</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Australian Privacy Act Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Bilingual English & Persian (RTL)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Memorial Mode Respectful Support</span>
          </div>
        </div>
      </section>

      {/* Live Sample Demos Showcase */}
      <section className="relative z-10 border-t border-stone-800/80 bg-stone-950/60 py-20 px-6 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
              Curated Showcases
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
              Experience the Guest Journey
            </h2>
            <p className="mt-2 text-sm text-stone-400 max-w-lg mx-auto">
              Test each ceremony style with animated gate reveals, bilingual toggles, and live RSVP.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* 1. Anniversary Demo */}
            <div className="group rounded-card border border-stone-800 bg-stone-900/90 p-6 transition-all duration-300 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    Royal Ivory Theme
                  </span>
                  <Heart className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Niloofar & Sadra
                </h3>
                <p className="text-xs font-serif italic text-amber-400/80 mt-0.5">
                  10th Wedding Anniversary
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Wax-seal envelope reveal, heirloom romantic waltz audio, black-tie dress code, and wishing well PayID integration.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">/anniversary</span>
                <Link
                  href="/i/anniversary/armita-party-g9qtmt"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>Open Invite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Persian Wedding Demo */}
            <div className="group rounded-card border border-stone-800 bg-stone-900/90 p-6 transition-all duration-300 hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                    Persian Rose Theme
                  </span>
                  <Sparkles className="h-4 w-4 text-rose-400" />
                </div>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                  Roya & Kian
                </h3>
                <p className="text-xs font-serif italic text-rose-400/80 mt-0.5">
                  Sofreh Aghd & Persian Celebration
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Architectural arch decoration, dual Jalali calendar conversion, traditional setar music, and Halal catering options.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">/wedding</span>
                <Link
                  href="/i/wedding/roya-kian-wedding-987"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300"
                >
                  <span>Open Invite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 3. Memorial Service Demo */}
            <div className="group rounded-card border border-stone-800 bg-stone-900/90 p-6 transition-all duration-300 hover:border-stone-500/50 hover:shadow-2xl hover:shadow-stone-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-stone-700/50 border border-stone-600 px-2.5 py-0.5 text-[11px] font-semibold text-stone-300">
                    Memorial Mode
                  </span>
                  <ShieldCheck className="h-4 w-4 text-stone-400" />
                </div>
                <h3 className="font-display text-xl font-bold text-white group-hover:text-stone-300 transition-colors">
                  Dariush Memorial
                </h3>
                <p className="text-xs font-serif italic text-stone-400 mt-0.5">
                  Celebration of Life & Remembrance
                </p>
                <p className="mt-3 text-xs text-stone-400 leading-relaxed">
                  Respectful plain-fade gate, subdued typography, tribute book condolence message, and no confetti or celebratory countdowns.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-mono">/memorial</span>
                <Link
                  href="/i/memorial/dariush-memorial-456"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white"
                >
                  <span>Open Invite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Matrix */}
      <section className="relative z-10 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Engineered for Australian Event Hosts
            </h2>
            <p className="mt-3 text-sm text-stone-400 max-w-xl mx-auto">
              Everything you need to orchestrate guests, catering, and entry from one intuitive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <Share2 className="h-7 w-7 text-emerald-400 mb-4" />
              <h3 className="text-base font-bold text-white">WhatsApp & SMS Direct Sharing</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Generate 1-click personalized WhatsApp messages that open directly into in-app webviews without losing session or state.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <Utensils className="h-7 w-7 text-amber-400 mb-4" />
              <h3 className="text-base font-bold text-white">Catering & Dietary Intelligence</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Breakdown of Halal, Vegan, Gluten-Free, and Nut allergies instantly exported with UTF-8 BOM CSV for Perth caterers.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <QrCode className="h-7 w-7 text-blue-400 mb-4" />
              <h3 className="text-base font-bold text-white">Digital Pass & Door Check-In</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Each guest party receives a personalized QR code pass for rapid door check-in via Managevent Crew mode or kiosks.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <ShieldCheck className="h-7 w-7 text-purple-400 mb-4" />
              <h3 className="text-base font-bold text-white">Privacy by Architecture</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Unguessable HMAC tokens, no guest names in Open Graph tags, real 404s for invalid tokens, and zero personal data stored outside Sydney.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <Calendar className="h-7 w-7 text-amber-400 mb-4" />
              <h3 className="text-base font-bold text-white">Deterministic Calendar Sync</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                One-tap .ics file downloads and Google/Apple calendar integration pinned to local Western Australia timezone.
              </p>
            </div>

            <div className="rounded-card border border-stone-800 bg-stone-900/60 p-6">
              <Layers className="h-7 w-7 text-rose-400 mb-4" />
              <h3 className="text-base font-bold text-white">Integrated Managevent Bridge</h3>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Headcounts and guest dietary preferences flow directly into Managevent marketplace vendor bookings and seating charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-10 px-6 text-xs text-stone-500 text-center">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} Managevent Australia. Hosted in Sydney (ap-southeast-2).
          </div>
          <div className="flex items-center gap-6">
            <Link href="/templates" className="hover:text-stone-300 transition-colors">
              Templates
            </Link>
            <Link href="/studio" className="hover:text-stone-300 transition-colors">
              Host Studio
            </Link>
            <span className="font-mono text-[11px] text-stone-600">invitation.managevent.com.au</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
