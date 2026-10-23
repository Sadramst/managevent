"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";
import type { InvitationThemeId, ExperienceMode } from "@managevent/types";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  Shield,
  Palette,
  CheckCircle2,
} from "lucide-react";

const CEREMONY_OPTIONS = [
  { slug: "wedding", name: "Wedding Celebration", defaultTheme: "emerald-botanic" as InvitationThemeId, isMemorial: false },
  { slug: "persian-ceremony", name: "Sofreh Aghd / Persian Ceremony", defaultTheme: "persian-azure" as InvitationThemeId, isMemorial: false },
  { slug: "anniversary", name: "Wedding Anniversary", defaultTheme: "royal-ivory" as InvitationThemeId, isMemorial: false },
  { slug: "birthday", name: "Milestone Birthday", defaultTheme: "alabaster-platinum" as InvitationThemeId, isMemorial: false },
  { slug: "corporate-gala", name: "Corporate Gala / Dinner", defaultTheme: "midnight-celestial" as InvitationThemeId, isMemorial: false },
  { slug: "memorial-service", name: "Memorial / Celebration of Life", defaultTheme: "memorial-alabaster" as InvitationThemeId, isMemorial: true },
];

export default function NewEventWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [ceremonySlug, setCeremonySlug] = useState("wedding");
  const [title, setTitle] = useState("");
  const [coupleOrHostNames, setCoupleOrHostNames] = useState("");
  const [headline, setHeadline] = useState("We invite you to celebrate with us.");
  const [startsAt, setStartsAt] = useState("2026-11-20T18:00");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [themeId, setThemeId] = useState<InvitationThemeId>("emerald-botanic");
  const [gateStyle, setGateStyle] = useState<"wax-seal" | "ribbon" | "arch" | "plain-fade">("wax-seal");
  const [isFaEnabled, setIsFaEnabled] = useState(false);

  const selectedCeremony = CEREMONY_OPTIONS.find((c) => c.slug === ceremonySlug) ?? CEREMONY_OPTIONS[0]!;
  const isMemorial = selectedCeremony.isMemorial;
  const experienceMode: ExperienceMode = isMemorial ? "MEMORIAL" : "CELEBRATION";

  const handleCeremonySelect = (slug: string) => {
    setCeremonySlug(slug);
    const cer = CEREMONY_OPTIONS.find((c) => c.slug === slug);
    if (cer) {
      setThemeId(cer.defaultTheme);
      if (cer.isMemorial) {
        setGateStyle("plain-fade");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const createdEvent = invitationStore.createEvent({
      title: title.trim() || `${coupleOrHostNames}’s Celebration`,
      ceremonySlug,
      experienceMode,
      themeId,
      templateSlug: "custom-invitation",
      gateStyle: isMemorial ? "plain-fade" : gateStyle,
      startsAt: new Date(startsAt).toISOString(),
      timeZone: "Australia/Perth",
      languages: isFaEnabled ? ["en", "fa"] : ["en"],
      defaultLanguage: "en",
      venueName: venueName.trim() || "The Celebration Venue",
      venueAddress: venueAddress.trim() || "Perth, Western Australia",
      content: {
        headline: headline.trim(),
        subheadline: "An evening of memories, food, and music.",
        coupleOrHostNames: coupleOrHostNames.trim() || "Hosts",
        invitationStory: [
          "We are deeply delighted to invite our closest family and friends to celebrate this unforgettable milestone with us.",
        ],
      },
      parties: [
        {
          name: "Honoured Guest",
          seats: 2,
        },
      ],
    });

    router.push(`/studio/${createdEvent.id}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-16">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/studio" className="flex items-center gap-2 text-stone-600 hover:text-stone-900 text-xs font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Studio</span>
          </Link>
          <span className="font-display text-sm font-bold text-stone-900">
            Create Digital Invitation
          </span>
          <div className="text-xs text-stone-400 font-mono">Step {step} of 3</div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-2xl px-6 pt-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 1: Ceremony & Honourees */}
          {step === 1 && (
            <div className="rounded-card border bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-stone-900">
                  Select Ceremony Type
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Managevent tunes typography, tone, and privacy features specifically for your ceremony.
                </p>
              </div>

              {/* Ceremony Grid */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {CEREMONY_OPTIONS.map((c) => {
                  const isSelected = ceremonySlug === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => handleCeremonySelect(c.slug)}
                      className={`flex items-center justify-between rounded-button border p-3.5 text-start transition-all ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600"
                          : "hover:border-stone-400"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-900">{c.name}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {c.isMemorial ? "Memorial Mode protected" : "Celebration theme"}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Event Headline or Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roya & Kian's Sofreh Aghd or 10th Anniversary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Couple or Host Names
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Niloofar & Sadra"
                    value={coupleOrHostNames}
                    onChange={(e) => setCoupleOrHostNames(e.target.value)}
                    className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  disabled={!title.trim() || !coupleOrHostNames.trim()}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  <span>Continue to Venue & Date</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Date & Venue */}
          {step === 2 && (
            <div className="rounded-card border bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-stone-900">
                  Ceremony Date & Location
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Guests will see deterministic countdowns, Apple/Google Maps links, and .ics calendar sync.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Date & Starting Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute start-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="datetime-local"
                      required
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full rounded-button border ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Venue Name
                  </label>
                  <div className="relative">
                    <MapPin className="absolute start-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Perth Yacht Club or Swan Valley Estate"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="w-full rounded-button border ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Full Venue Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Australia II Dr, Crawley WA 6009"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Bilingual toggle */}
                <div className="rounded-button border bg-stone-50 p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-stone-800">
                      Enable Bilingual Farsi / Persian (فارسی)
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Adds native RTL layout and deterministic Persian Jalali calendar support.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFaEnabled}
                    onChange={(e) => setIsFaEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-button border px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!venueName.trim() || !venueAddress.trim()}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  <span>Continue to Design & Theme</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Theme & Gate */}
          {step === 3 && (
            <div className="rounded-card border bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-stone-900">
                  Visual Design & Gate Reveal
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Choose the entrance animation and palette for your guests.
                </p>
              </div>

              {/* Theme Palette */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  Select Theme Palette
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {Object.values(INVITATION_THEMES)
                    .filter((t) => (isMemorial ? t.id.startsWith("memorial-") : !t.id.startsWith("memorial-")))
                    .map((t) => {
                      const isSelected = themeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeId(t.id as InvitationThemeId)}
                          className={`rounded-button border p-3 text-start transition-all ${
                            isSelected
                              ? "border-amber-600 ring-1 ring-amber-600 bg-amber-50/50"
                              : "hover:border-stone-400"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">{t.name}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                          </div>
                          <div className="mt-2 flex h-3 w-full rounded overflow-hidden">
                            <div className="flex-1" style={{ backgroundColor: t.colors.surface }} />
                            <div className="flex-1" style={{ backgroundColor: t.colors.accent }} />
                            <div className="flex-1" style={{ backgroundColor: t.colors.accentInk }} />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Gate Style */}
              {!isMemorial && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Envelope Gate Reveal Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "wax-seal", name: "Wax Seal Break" },
                        { id: "arch", name: "Architectural Arch" },
                        { id: "plain-fade", name: "Gentle Fade" },
                      ] as const
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGateStyle(g.id)}
                        className={`rounded-button border p-2.5 text-center text-xs font-semibold transition-all ${
                          gateStyle === g.id
                            ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-600"
                            : "text-stone-700 hover:border-stone-400"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-button border px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Create & Launch Studio</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
