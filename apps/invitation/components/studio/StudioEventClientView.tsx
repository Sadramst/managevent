"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { EventModel, EventResponsesSummary, GuestParty } from "@/lib/types";
import type { InvitationThemeId } from "@managevent/types";
import { StatsOverview } from "@/components/studio/StatsOverview";
import { GuestTable } from "@/components/studio/GuestTable";
import { AddPartyModal } from "@/components/studio/AddPartyModal";
import { CsvImportModal } from "@/components/studio/CsvImportModal";
import { WhatsAppStudioModal } from "@/components/studio/WhatsAppStudioModal";
import { QrCodeModal } from "@/components/studio/QrCodeModal";
import { ThemeStudio } from "@/components/studio/ThemeStudio";
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Palette,
  BarChart3,
  FileSpreadsheet,
  Check,
  Copy,
  Clock,
} from "lucide-react";

interface StudioEventClientViewProps {
  initialEvent: EventModel;
  initialSummary: EventResponsesSummary | null;
}

export function StudioEventClientView({
  initialEvent,
  initialSummary,
}: StudioEventClientViewProps) {
  const [event, setEvent] = useState<EventModel>(initialEvent);
  const [summary, setSummary] = useState<EventResponsesSummary | null>(initialSummary);

  const [activeTab, setActiveTab] = useState<
    "overview" | "guests" | "design" | "responses" | "settings"
  >("overview");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [whatsAppParty, setWhatsAppParty] = useState<GuestParty | null>(null);
  const [qrParty, setQrParty] = useState<GuestParty | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const primaryParty = event.parties[0];
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://invitation.managevent.com.au";
  const previewUrl = primaryParty
    ? `${origin}/i/${event.slug}/${primaryParty.token}`
    : `${origin}/i/${event.slug}`;

  const handleAddParty = async (
    partyName: string,
    seats: number,
    tags: string[],
    tableLabel?: string,
  ) => {
    try {
      const res = await fetch(`/api/events/${event.id}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyName, seats, tags, tableLabel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvent(data.event);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to add party via API", err);
    }
  };

  const handleCsvImport = async (rows: import("@/lib/csv-helper").CsvGuestRow[]) => {
    try {
      const parties = rows.map((row) => ({
        name: row.name,
        seats: row.seats ?? 1,
        tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : ["CSV Import"],
        tableLabel: row.table,
      }));
      const res = await fetch(`/api/events/${event.id}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parties }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvent(data.event);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to import CSV via API", err);
    }
  };

  const handleSelectTheme = async (newThemeId: InvitationThemeId) => {
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: newThemeId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvent(data.event);
        }
      }
    } catch (err) {
      console.error("Failed to update theme via API", err);
    }
  };

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(previewUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-16">
      {/* Studio Header */}
      <header className="border-b bg-white px-6 py-4 sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-stone-900">{event.title}</h1>
                <span className="rounded-full bg-stone-100 border px-2 py-0.5 text-[10px] font-mono text-stone-600 uppercase">
                  {event.ceremonySlug}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-sans">
                {event.venue.name} •{" "}
                {new Date(event.startsAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedLink ? "Copied!" : "Copy Guest Link"}</span>
            </button>

            <Link
              href={`/studio/${event.id}/awaiting`}
              className="inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Clock className="h-3.5 w-3.5 text-stone-500" />
              <span>Awaiting Replies</span>
            </Link>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-button bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              <span>Preview Micro-site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl mt-4 flex gap-6 text-xs font-semibold border-t pt-2">
          {[
            { id: "overview", label: "Overview & Metrics", icon: BarChart3 },
            { id: "guests", label: `Guest List (${event.parties.length})`, icon: Users },
            { id: "design", label: "Design & Theme", icon: Palette },
            { id: "responses", label: "Catering & Dietary", icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id as "overview" | "guests" | "design" | "responses")
                }
                className={`inline-flex items-center gap-2 border-b-2 pb-2 transition-all ${
                  isActive
                    ? "border-amber-600 text-amber-900 font-bold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && summary && (
          <div className="space-y-8">
            <StatsOverview summary={summary} />

            {/* Quick Guest List Snapshot */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-stone-900">
                  Recent Guest Activity
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("guests")}
                  className="text-xs font-semibold text-amber-700 hover:underline"
                >
                  View full guest list →
                </button>
              </div>

              <GuestTable
                parties={event.parties.slice(0, 5)}
                eventSlug={event.slug}
                eventId={event.id}
                onOpenAddModal={() => setIsAddOpen(true)}
                onOpenWhatsApp={(party) => setWhatsAppParty(party)}
                onOpenQr={(party) => setQrParty(party)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: GUESTS */}
        {activeTab === "guests" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-stone-900">
                  Guest Parties & Invitations
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Assign seats, generate personalized WhatsApp messages, and export dietary records.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Bulk Import CSV</span>
                </button>
              </div>
            </div>

            <GuestTable
              parties={event.parties}
              eventSlug={event.slug}
              eventId={event.id}
              onOpenAddModal={() => setIsAddOpen(true)}
              onOpenWhatsApp={(party) => setWhatsAppParty(party)}
              onOpenQr={(party) => setQrParty(party)}
            />
          </div>
        )}

        {/* TAB 3: DESIGN */}
        {activeTab === "design" && (
          <div className="space-y-6">
            <ThemeStudio
              currentThemeId={event.themeId}
              experienceMode={event.experienceMode}
              onSelectTheme={handleSelectTheme}
            />
          </div>
        )}

        {/* TAB 4: RESPONSES & CATERING */}
        {activeTab === "responses" && summary && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">
                Catering & Dietary Breakdown
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Exportable summary formatted for Perth caterers with UTF-8 BOM encoding.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Dietary card */}
              <div className="rounded-card border bg-white p-6 shadow-xs">
                <h3 className="font-serif text-base font-bold text-stone-900 mb-4">
                  Dietary Breakdown
                </h3>
                {Object.keys(summary.dietaryBreakdown).length === 0 ? (
                  <p className="text-xs text-stone-500">
                    No special dietary requirements recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(summary.dietaryBreakdown).map(([key, count]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between border-b pb-2 text-xs"
                      >
                        <span className="font-medium text-stone-700">{key.replace("_", " ")}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                          {count} {count === 1 ? "guest" : "guests"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Guest Notes / Messages */}
              <div className="rounded-card border bg-white p-6 shadow-xs">
                <h3 className="font-serif text-base font-bold text-stone-900 mb-4">
                  Messages & Wishes from Guests
                </h3>
                {summary.messages.length === 0 ? (
                  <p className="text-xs text-stone-500">No guest messages received yet.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {summary.messages.map((m, idx) => (
                      <div key={idx} className="rounded-button bg-stone-50 p-3 text-xs border">
                        <div className="font-semibold text-stone-900">{m.from}</div>
                        <p className="mt-1 text-stone-600 italic">"{m.message}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddPartyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddParty}
      />

      <CsvImportModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        onImport={handleCsvImport}
      />

      <WhatsAppStudioModal
        isOpen={Boolean(whatsAppParty)}
        party={whatsAppParty}
        event={event}
        onClose={() => setWhatsAppParty(null)}
      />

      <QrCodeModal
        isOpen={Boolean(qrParty)}
        party={qrParty}
        event={event}
        onClose={() => setQrParty(null)}
      />
    </div>
  );
}
