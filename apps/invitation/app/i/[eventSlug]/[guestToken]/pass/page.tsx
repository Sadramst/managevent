"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { ArrowLeft, Download, QrCode as QrIcon, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";

interface PassPageProps {
  params: Promise<{
    eventSlug: string;
    guestToken: string;
  }>;
}

export default function GuestPassPage({ params }: PassPageProps) {
  const { eventSlug, guestToken } = use(params);
  const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  if (!lookup) {
    notFound();
  }

  const { event, party } = lookup;
  const theme = INVITATION_THEMES[event.themeId] || INVITATION_THEMES["royal-ivory"];
  const { colors } = theme;

  useEffect(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://invitation.managevent.com.au";
    const checkinPayload = `${origin}/i/${event.slug}/${party.token}`;

    QRCode.toDataURL(checkinPayload, {
      width: 280,
      margin: 1,
      color: {
        dark: colors.accentInk,
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error creating pass QR", err));
  }, [event.slug, party.token, colors.accentInk]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-8 flex flex-col items-center justify-center font-sans"
      style={{
        backgroundColor: colors.bg,
        color: colors.ink,
      }}
    >
      {/* Back button */}
      <div className="w-full max-w-sm mb-6 print:hidden">
        <Link
          href={`/i/${event.slug}/${party.token}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: colors.accentInk }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invitation</span>
        </Link>
      </div>

      {/* Pass Ticket Card */}
      <div
        className="w-full max-w-sm rounded-card border shadow-xl overflow-hidden print:shadow-none"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {/* Ticket Header */}
        <div
          className="p-6 text-center border-b"
          style={{
            backgroundColor: colors.bgWarm,
            borderColor: colors.rule,
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: colors.accent }}
          >
            Digital Ceremony Pass
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold" style={{ color: colors.accentInk }}>
            {event.content.coupleOrHostNames}
          </h1>
          <p className="mt-1 font-serif text-xs italic" style={{ color: colors.inkMuted }}>
            {event.title}
          </p>
        </div>

        {/* QR Code Section */}
        <div className="p-6 flex flex-col items-center text-center">
          <div
            className="rounded-card border p-3 shadow-inner bg-white"
            style={{ borderColor: colors.rule }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Check-in QR Code" className="h-48 w-48" />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center text-xs opacity-50">
                Generating pass...
              </div>
            )}
          </div>

          <h2 className="mt-4 font-serif text-lg font-bold" style={{ color: colors.accentInk }}>
            {party.displayName}
          </h2>

          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>RSVP Confirmed</span>
          </div>

          {/* Details Grid */}
          <div
            className="mt-6 w-full grid grid-cols-2 gap-3 text-start border-t pt-4"
            style={{ borderColor: colors.rule }}
          >
            <div>
              <span className="block text-[10px] font-mono uppercase text-stone-500">Seats</span>
              <span className="font-semibold text-xs">{party.maxSeats} Guest(s)</span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase text-stone-500">Table</span>
              <span className="font-semibold text-xs">{party.tableLabel || "Open Seating"}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] font-mono uppercase text-stone-500">Venue</span>
              <span className="font-semibold text-xs truncate block">{event.venue.name}</span>
            </div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="relative border-t border-dashed" style={{ borderColor: colors.rule }}>
          <div
            className="absolute -top-3 -start-3 h-6 w-6 rounded-full border"
            style={{ backgroundColor: colors.bg, borderColor: colors.rule }}
          />
          <div
            className="absolute -top-3 -end-3 h-6 w-6 rounded-full border"
            style={{ backgroundColor: colors.bg, borderColor: colors.rule }}
          />
        </div>

        {/* Footer print action */}
        <div className="p-4 text-center print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-button px-4 py-2 text-xs font-bold shadow-xs hover:brightness-105 transition-all text-white"
            style={{ backgroundColor: colors.accent }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Print or Save Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
}
