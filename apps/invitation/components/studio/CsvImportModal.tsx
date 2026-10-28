"use client";

import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, Check } from "lucide-react";
import { parseGuestsCsv, type CsvGuestRow } from "@/lib/csv-helper";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: CsvGuestRow[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [csvContent, setCsvContent] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvGuestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      try {
        const rows = parseGuestsCsv(text);
        if (rows.length === 0) {
          setError(
            "No valid guest rows found in CSV. Please ensure you have a header row (Name, Seats, Table, Tags).",
          );
          setParsedRows([]);
        } else {
          setParsedRows(rows);
          setError(null);
        }
      } catch {
        setError("Error parsing CSV file format.");
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setCsvContent(text);
    if (!text.trim()) {
      setParsedRows([]);
      setError(null);
      return;
    }
    try {
      const rows = parseGuestsCsv(text);
      setParsedRows(rows);
      setError(rows.length === 0 ? "No valid guest rows detected." : null);
    } catch {
      setError("Error parsing CSV format.");
    }
  };

  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;
    onImport(parsedRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-card border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-lg font-bold text-neutral-900">
              Bulk Import Guests via CSV
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

        <div className="mt-4 space-y-4">
          <p className="text-xs text-neutral-500">
            Upload or paste your guest list spreadsheet (Excel, Google Sheets, or CSV). Supports
            English and Persian headers (نام, تعداد, میز).
          </p>

          {/* Upload input */}
          <div className="rounded-button border-2 border-dashed border-neutral-300 p-4 text-center hover:border-amber-500 transition-colors">
            <Upload className="mx-auto h-6 w-6 text-neutral-400 mb-2" />
            <label className="cursor-pointer text-xs font-semibold text-amber-600 hover:text-amber-700">
              <span>Choose CSV file to upload</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-neutral-400 mt-1">UTF-8 CSV files with header row</p>
          </div>

          {/* Or Paste text */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Or Paste CSV Data Directly:
            </label>
            <textarea
              rows={4}
              value={csvContent}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Name,Seats,Table,Tags&#10;Dr. Sarah Jenkins,2,Table 1,VIP&#10;The Rezaei Family,4,Table 2,Family"
              className="w-full rounded-button border p-2.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="rounded-button border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="rounded-card border bg-neutral-50 p-3 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 mb-2">
                <span>Preview ({parsedRows.length} guests found):</span>
              </div>
              <div className="space-y-1.5">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-button bg-white px-3 py-1.5 text-xs border"
                  >
                    <span className="font-semibold text-neutral-900">{row.name}</span>
                    <span className="text-neutral-500">
                      {row.seats || 1} seats • {row.table || "No table"} • {row.tags || "General"}
                    </span>
                  </div>
                ))}
                {parsedRows.length > 5 && (
                  <div className="text-center text-[11px] text-neutral-500 pt-1">
                    ...and {parsedRows.length - 5} more guests
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 rounded-button bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Import {parsedRows.length} Guests</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
