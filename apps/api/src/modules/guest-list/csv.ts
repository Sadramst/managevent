/**
 * Guest-list CSV: an RFC 4180 reader, the import planner and the export writer.
 *
 * Everything here is pure (no database), so it is tested without one.
 *
 * Import rules:
 * - A UTF-8 BOM is ignored. The delimiter is `,` or `;`, whichever the header row uses more.
 * - Quoted fields may contain the delimiter, doubled quotes (`""`) and line breaks.
 * - The first row is the header. Recognised columns (case-insensitive): `name` / `guest name`,
 *   `party` / `party name` / `group`, `seats` / `max seats`, `table` / `table number`, `email`,
 *   `phone`, `tags`, `child` / `is child`, `plusone` / `plus one`. Without a name column the first
 *   column is the name.
 * - Rows sharing a `party` value form one party. A row without one is a party of its own.
 * - A row without a name is skipped. An invalid email or phone is dropped and reported; the guest
 *   is still imported. At most 20 guests per party and 2000 data rows per file.
 */
import { AuPhoneSchema, type GuestImportErrorCode } from "@managevent/validators";
import { z } from "zod";

export const MAX_IMPORT_ROWS = 2000;
export const MAX_PARTY_GUESTS = 20;
const MAX_NAME_LENGTH = 120;
const MAX_TABLE_LENGTH = 60;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 10;

const EmailSchema = z.string().email().max(254);

// ─── Reader ─────────────────────────────────────────────────────────────────

/** Counts `delimiter` in `line`, ignoring anything inside double quotes. */
function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

/** `;` when the first record uses it more often than `,` (European spreadsheet exports). */
export function detectDelimiter(text: string): "," | ";" {
  let end = 0;
  let quoted = false;
  for (; end < text.length; end += 1) {
    const char = text[end];
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
  }
  const header = text.slice(0, end);
  return countOutsideQuotes(header, ";") > countOutsideQuotes(header, ",") ? ";" : ",";
}

/**
 * Parses CSV text into records of fields (RFC 4180). Line breaks may be CRLF, LF or CR. An empty
 * line yields a record with one empty field, so record indexes match spreadsheet row numbers.
 */
export function parseCsv(input: string, delimiter?: "," | ";"): string[][] {
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  if (text.length === 0) return [];
  const sep = delimiter ?? detectDelimiter(text);

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  /** True once the current field started with a quote and that quote has closed. */
  let closedQuote = false;

  const endField = () => {
    record.push(field);
    field = "";
    closedQuote = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0 && !closedQuote) {
      quoted = true;
    } else if (char === sep) {
      endField();
    } else if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
    } else if (char === "\n") {
      endRecord();
    } else {
      field += char;
    }
  }
  // The last record has no trailing line break (or the file ends inside an unclosed quote).
  if (field.length > 0 || record.length > 0 || closedQuote) endRecord();
  return records;
}

// ─── Import planner ─────────────────────────────────────────────────────────

export interface ImportGuest {
  name: string;
  isChild: boolean;
  email: string | null;
  phone: string | null;
}

export interface ImportParty {
  displayName: string;
  maxSeats: number;
  allowPlusOnes: boolean;
  tableLabel: string | null;
  tags: string[];
  guests: ImportGuest[];
}

export interface ImportRowError {
  /** 1-based row number in the uploaded file (the header is row 1). */
  row: number;
  code: GuestImportErrorCode;
  message: string;
}

export interface GuestImportPlan {
  parties: ImportParty[];
  errors: ImportRowError[];
  /** Data rows that produced no guest (missing name, party full, or beyond the row limit). */
  skippedRows: number;
  guestCount: number;
  /** True when the file has more than `MAX_IMPORT_ROWS` data rows. A commit is refused. */
  tooManyRows: boolean;
}

type Column = "name" | "party" | "seats" | "table" | "email" | "phone" | "tags" | "child" | "plus";

const HEADER_ALIASES: Readonly<Record<string, Column>> = {
  name: "name",
  "guest name": "name",
  party: "party",
  "party name": "party",
  group: "party",
  seats: "seats",
  "max seats": "seats",
  table: "table",
  "table number": "table",
  email: "email",
  phone: "phone",
  tags: "tags",
  child: "child",
  "is child": "child",
  plusone: "plus",
  "plus one": "plus",
};

function normaliseHeader(value: string): string {
  return value
    .replace(/["']/g, "")
    .replace(/[_\s]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Trims a cell and removes the apostrophe our own export puts in front of values that a
 * spreadsheet would treat as a formula, so an exported file can be imported again.
 */
function cleanCell(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  return /^'[=+\-@]/.test(trimmed) ? trimmed.slice(1) : trimmed;
}

const isTruthy = (value: string): boolean => /^(true|yes|y|1)$/i.test(value);

function splitTags(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH))
    .filter((tag) => tag.length > 0);
}

interface PartyDraft extends ImportParty {
  seatsRequested: number;
}

/** Turns CSV text into the parties it would create, plus per-row problems. Never throws. */
export function planGuestImport(csv: string): GuestImportPlan {
  const records = parseCsv(csv);
  const errors: ImportRowError[] = [];
  const drafts: PartyDraft[] = [];
  const byKey = new Map<string, PartyDraft>();
  let skippedRows = 0;
  let dataRows = 0;
  let tooManyRows = false;

  const header = records[0] ?? [];
  const columns = new Map<Column, number>();
  header.forEach((cell, index) => {
    const column = HEADER_ALIASES[normaliseHeader(cell)];
    if (column && !columns.has(column)) columns.set(column, index);
  });
  if (!columns.has("name")) columns.set("name", 0);

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index] ?? [];
    const row = index + 1;
    if (record.every((cell) => cell.trim().length === 0)) continue; // blank line

    dataRows += 1;
    if (dataRows > MAX_IMPORT_ROWS) {
      if (!tooManyRows) {
        tooManyRows = true;
        errors.push({
          row,
          code: "TOO_MANY_ROWS",
          message: `A file can hold at most ${MAX_IMPORT_ROWS} guests. Rows from here on were ignored.`,
        });
      }
      skippedRows += 1;
      continue;
    }

    const cell = (column: Column): string => {
      const position = columns.get(column);
      return position === undefined ? "" : cleanCell(record[position]);
    };

    const name = cell("name").slice(0, MAX_NAME_LENGTH).trim();
    if (name.length === 0) {
      errors.push({ row, code: "MISSING_NAME", message: "This row has no guest name." });
      skippedRows += 1;
      continue;
    }

    const partyValue = cell("party").slice(0, MAX_NAME_LENGTH).trim();
    const key = partyValue.length > 0 ? `p:${partyValue.replace(/\s+/g, " ").toLowerCase()}` : null;
    let draft = key ? byKey.get(key) : undefined;
    if (!draft) {
      draft = {
        displayName: partyValue.length > 0 ? partyValue : name,
        maxSeats: 1,
        allowPlusOnes: false,
        tableLabel: null,
        tags: [],
        guests: [],
        seatsRequested: 0,
      };
      drafts.push(draft);
      if (key) byKey.set(key, draft);
    }

    if (draft.guests.length >= MAX_PARTY_GUESTS) {
      errors.push({
        row,
        code: "PARTY_TOO_LARGE",
        message: `A party can have at most ${MAX_PARTY_GUESTS} guests.`,
      });
      skippedRows += 1;
      continue;
    }

    let email: string | null = cell("email") || null;
    if (email !== null && !EmailSchema.safeParse(email).success) {
      errors.push({
        row,
        code: "INVALID_EMAIL",
        message: "The email address is not valid and was left out.",
      });
      email = null;
    }
    let phone: string | null = cell("phone") || null;
    if (phone !== null && !AuPhoneSchema.safeParse(phone).success) {
      errors.push({
        row,
        code: "INVALID_PHONE",
        message: "The phone number is not a valid Australian number and was left out.",
      });
      phone = null;
    }

    draft.guests.push({ name, isChild: isTruthy(cell("child")), email, phone });

    const seats = Number.parseInt(cell("seats"), 10);
    if (Number.isFinite(seats) && seats > draft.seatsRequested) draft.seatsRequested = seats;
    if (isTruthy(cell("plus"))) draft.allowPlusOnes = true;
    const table = cell("table").slice(0, MAX_TABLE_LENGTH).trim();
    if (draft.tableLabel === null && table.length > 0) draft.tableLabel = table;
    for (const tag of splitTags(cell("tags"))) {
      if (draft.tags.length < MAX_TAGS && !draft.tags.includes(tag)) draft.tags.push(tag);
    }
  }

  // A party whose only row was rejected (for example after the row limit) has no guests.
  const parties: ImportParty[] = drafts
    .filter((draft) => draft.guests.length > 0)
    .map(({ seatsRequested, ...party }) => ({
      ...party,
      maxSeats: Math.min(MAX_PARTY_GUESTS, Math.max(seatsRequested, party.guests.length, 1)),
    }));

  return {
    parties,
    errors,
    skippedRows,
    guestCount: parties.reduce((sum, party) => sum + party.guests.length, 0),
    tooManyRows,
  };
}

// ─── Export writer ──────────────────────────────────────────────────────────

export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  // Neutralise spreadsheet formula injection (OWASP CSV injection): a text cell that starts with
  // one of these characters would otherwise be evaluated by Excel or Sheets.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Builds CSV text with a UTF-8 byte order mark (so Excel reads accented and non-Latin names
 * correctly), every cell quoted, and CRLF line endings.
 */
export function buildCsvWithBom(headers: readonly string[], rows: readonly CsvCell[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export const EXPORT_COLUMNS = [
  "Party Name",
  "Guest Name",
  "Is Child",
  "Plus One",
  "Status",
  "Responded At",
  "Table",
  "Seats",
  "Tags",
  "Email",
  "Phone",
  "Checked In",
  "Invite Path",
] as const;

export const EXPORT_HEALTH_COLUMNS = [
  "Dietary",
  "Allergy Severity",
  "Allergy Notes",
  "Accessibility Notes",
] as const;

export interface ExportGuestRow {
  partyName: string;
  guestName: string;
  isChild: boolean;
  isPlusOne: boolean;
  status: string;
  /** Already formatted in the event's time zone, or empty. */
  respondedAt: string;
  table: string;
  seats: number;
  tags: string[];
  email: string;
  phone: string;
  checkedIn: boolean;
  invitePath: string;
  health?: {
    dietary: string[];
    allergySeverity: string;
    allergyNotes: string;
    accessibilityNotes: string;
  };
}

const yesNo = (value: boolean): string => (value ? "Yes" : "No");

/** The guest export. Health columns appear only when `includeHealth` is true. */
export function buildGuestExportCsv(
  rows: readonly ExportGuestRow[],
  includeHealth: boolean,
): string {
  const headers: string[] = [...EXPORT_COLUMNS];
  if (includeHealth) headers.push(...EXPORT_HEALTH_COLUMNS);

  const cells = rows.map((row) => {
    const line: CsvCell[] = [
      row.partyName,
      row.guestName,
      yesNo(row.isChild),
      yesNo(row.isPlusOne),
      row.status,
      row.respondedAt,
      row.table,
      row.seats,
      row.tags.join("; "),
      row.email,
      row.phone,
      yesNo(row.checkedIn),
      row.invitePath,
    ];
    if (includeHealth) {
      line.push(
        (row.health?.dietary ?? []).join("; "),
        row.health?.allergySeverity ?? "",
        row.health?.allergyNotes ?? "",
        row.health?.accessibilityNotes ?? "",
      );
    }
    return line;
  });
  return buildCsvWithBom(headers, cells);
}
