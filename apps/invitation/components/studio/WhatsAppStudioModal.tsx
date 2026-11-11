"use client";

import React, { useState } from "react";
import type { GuestParty, EventModel } from "@/lib/types";
import { X, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";

interface WhatsAppStudioModalProps {
  party: GuestParty | null;
  event: EventModel;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppStudioModal: React.FC<WhatsAppStudioModalProps> = ({
  party,
  event,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !party) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://invitation.managevent.com.au";
  const guestLink = `${origin}/i/${event.slug}/${party.token}`;

  const messageEn = `Dear ${party.displayName},\n\nYou are warmly invited to join us for ${event.title}.\n\nPlease view your personal invitation and RSVP here:\n${guestLink}\n\nWe look forward to celebrating with you!\n— ${event.content.coupleOrHostNames}`;

  const currentMessage = messageEn;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(currentMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-card border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="font-display text-lg font-bold text-neutral-900">Share via WhatsApp</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600">
              Guest: <strong className="text-neutral-900">{party.displayName}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Personalized Message Preview:
            </label>
            <textarea
              readOnly
              rows={7}
              value={currentMessage}
              className="w-full rounded-button border bg-neutral-50 p-3 text-xs font-mono leading-relaxed text-neutral-800 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-button border px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-button bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
