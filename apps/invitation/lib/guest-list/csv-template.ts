/**
 * The downloadable CSV template for the guest import. The header uses the column names the API
 * recognises (`apps/api/src/modules/guest-list/csv.ts`); the example rows are copy.
 */
export const CSV_TEMPLATE_HEADER = [
  "name",
  "party",
  "email",
  "phone",
  "child",
  "seats",
  "table",
  "tags",
  "plus one",
] as const;

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV text (CRLF line ends, as spreadsheets expect) from the example rows. */
export function buildCsvTemplate(rows: readonly (readonly string[])[]): string {
  return [CSV_TEMPLATE_HEADER, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** A `data:` URL for a download link, with the byte order mark Excel needs for UTF-8. */
export function csvDataUrl(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${csv}`)}`;
}

/** The API accepts at most this many characters of CSV text (`GuestImportSchema`). */
export const MAX_CSV_LENGTH = 500_000;
