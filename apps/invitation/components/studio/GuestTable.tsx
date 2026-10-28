"use client";

import React, { useState } from "react";
import type { GuestParty } from "@/lib/types";
import { Search, Copy, Check, Share2, QrCode, Download, Plus, Filter } from "lucide-react";

interface GuestTableProps {
  parties: GuestParty[];
  eventSlug: string;
  eventId: string;
  onOpenAddModal: () => void;
  onOpenWhatsApp: (party: GuestParty) => void;
  onOpenQr: (party: GuestParty) => void;
}

export const GuestTable: React.FC<GuestTableProps> = ({
  parties,
  eventSlug,
  eventId,
  onOpenAddModal,
  onOpenWhatsApp,
  onOpenQr,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tableLabel && p.tableLabel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/i/${eventSlug}/${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  return (
    <div className="rounded-card border bg-white shadow-xs">
      {/* Table Toolbar */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search guests, table, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-button border ps-9 pe-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filter and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="inline-flex items-center gap-1 rounded-button border bg-neutral-50 px-2 py-1">
            <Filter className="h-3.5 w-3.5 text-neutral-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-neutral-700 focus:outline-none"
            >
              <option value="ALL">All Statuses ({parties.length})</option>
              <option value="YES">Attending</option>
              <option value="NO">Declined</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <a
            href={`/api/guests/export?eventId=${eventId}`}
            download={`guests_${eventSlug}.csv`}
            className="inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>

          {/* Add Guest Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* Guest List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead className="border-b bg-neutral-50 text-neutral-500 font-semibold">
            <tr>
              <th className="px-4 py-3 text-start">Guest / Party</th>
              <th className="px-4 py-3 text-start">Status</th>
              <th className="px-4 py-3 text-start">Seats / Table</th>
              <th className="px-4 py-3 text-start">Dietary / Notes</th>
              <th className="px-4 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredParties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No guest parties match your search or filter.
                </td>
              </tr>
            ) : (
              filteredParties.map((party) => {
                const isCopied = copiedToken === party.token;
                return (
                  <tr key={party.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Name & Tags */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{party.displayName}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {party.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {party.status === "YES" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Attending
                        </span>
                      ) : party.status === "NO" ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          Declined
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Seats & Table */}
                    <td className="px-4 py-3 text-neutral-700">
                      <div>
                        {party.maxSeats} {party.maxSeats === 1 ? "seat" : "seats"}
                      </div>
                      {party.tableLabel && (
                        <div className="text-[11px] text-neutral-500">{party.tableLabel}</div>
                      )}
                    </td>

                    {/* Dietary */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {party.members
                          .filter((m) => m.dietary && m.dietary.some((d) => d !== "NONE"))
                          .map((m) => (
                            <div key={m.id} className="text-xs">
                              <span className="font-medium text-neutral-800">{m.name}: </span>
                              <span className="text-amber-700 font-semibold">
                                {m.dietary?.filter((d) => d !== "NONE").join(", ")}
                              </span>
                            </div>
                          ))}
                        {party.notes && (
                          <div className="text-xs text-neutral-500 italic truncate max-w-xs">
                            "{party.notes}"
                          </div>
                        )}
                        {!party.notes &&
                          !party.members.some((m) => m.dietary?.some((d) => d !== "NONE")) && (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(party.token)}
                          title="Copy personalized guest link"
                          className="rounded-button border p-1.5 text-neutral-600 hover:bg-neutral-100 transition-colors"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* WhatsApp Share */}
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(party)}
                          title="Share via WhatsApp"
                          className="rounded-button border p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>

                        {/* QR Code Pass */}
                        <button
                          type="button"
                          onClick={() => onOpenQr(party)}
                          title="View QR Code Pass"
                          className="rounded-button border p-1.5 text-neutral-600 hover:bg-neutral-100 transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
