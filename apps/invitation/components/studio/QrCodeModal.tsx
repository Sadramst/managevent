"use client";

import React, { useEffect, useState } from "react";
import type { GuestParty, EventModel } from "@/lib/types";
import { X, QrCode as QrIcon, Download } from "lucide-react";
import QRCode from "qrcode";

interface QrCodeModalProps {
  party: GuestParty | null;
  event: EventModel;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  party,
  event,
  isOpen,
  onClose,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!party) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://invitation.managevent.com.au";
    const fullUrl = `${origin}/i/${event.slug}/${party.token}`;

    QRCode.toDataURL(fullUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR", err));
  }, [party, event.slug]);

  if (!isOpen || !party) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-card border bg-white p-6 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b pb-3 text-start">
          <div className="flex items-center gap-2">
            <QrIcon className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-base font-bold text-neutral-900">
              Personal Guest QR Pass
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-6 flex flex-col items-center">
          <div className="rounded-card border bg-white p-3 shadow-sm">
            {dataUrl ? (
              <img src={dataUrl} alt="Guest QR Pass" className="h-52 w-52" />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-neutral-400">
                Generating QR...
              </div>
            )}
          </div>
          <h4 className="mt-3 font-serif text-base font-bold text-neutral-900">
            {party.displayName}
          </h4>
          <p className="text-xs text-neutral-500">
            {event.title} • {party.tableLabel || "General Seating"}
          </p>
        </div>

        {dataUrl && (
          <div className="pt-2 border-t flex justify-center">
            <a
              href={dataUrl}
              download={`qr_${party.displayName.replace(/\s+/g, "_")}.png`}
              className="inline-flex items-center gap-2 rounded-button bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PNG for Print</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
