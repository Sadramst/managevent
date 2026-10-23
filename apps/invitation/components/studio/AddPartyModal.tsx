"use client";

import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (partyName: string, seats: number, tags: string[], tableLabel?: string) => void;
}

export const AddPartyModal: React.FC<AddPartyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [partyName, setPartyName] = useState("");
  const [seats, setSeats] = useState(2);
  const [tableLabel, setTableLabel] = useState("");
  const [tagsInput, setTagsInput] = useState("Family");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onAdd(partyName.trim(), Number(seats), tags, tableLabel.trim() || undefined);
    setPartyName("");
    setSeats(2);
    setTableLabel("");
    setTagsInput("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-card border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-lg font-bold text-neutral-900">Add Guest Party</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Party / Primary Guest Name
            </label>
            <input
              type="text"
              required
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. John & Sarah Doe or The Smith Family"
              className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Seats Allocated
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Table Assignment (Optional)
              </label>
              <input
                type="text"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="e.g. Table 4"
                className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. VIP, Family, Groom's Friends"
              className="w-full rounded-button border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-button bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Save Party
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
