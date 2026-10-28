/**
 * CSV Import & Export utilities with mandatory UTF-8 BOM support for Farsi & international text (`WEBSITE.md` §B7).
 */

export interface CsvGuestRow {
  name: string;
  partyName?: string | undefined;
  seats?: number | undefined;
  plusOnes?: boolean | undefined;
  isChild?: boolean | undefined;
  table?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tags?: string | undefined;
}

/**
 * Parses CSV text into guest records, handling quoted fields, commas/semicolons, and Windows CRLF.
 */
export function parseGuestsCsv(csvText: string): CsvGuestRow[] {
  // Strip BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0] ?? "";
  const delimiter = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/["']/g, ""));

  const rows: CsvGuestRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    // Basic CSV tokeniser supporting double quotes
    const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, "g");
    const values: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const val = (match[1] !== undefined ? match[1] : (match[2] ?? "")).trim();
      values.push(val);
    }

    if (values.length === 0 || !values.some((v) => v.length > 0)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] ?? "";
    });

    const name =
      rowObj.name || rowObj["guest name"] || rowObj["مهمان"] || rowObj["نام"] || values[0] || "";
    if (!name) continue;

    const partyName =
      rowObj.party || rowObj["party name"] || rowObj["خانواده"] || rowObj.group || name;
    const seats = Number.parseInt(
      rowObj.seats || rowObj["max seats"] || rowObj["تعداد"] || "1",
      10,
    );
    const table = rowObj.table || rowObj["table number"] || rowObj["میز"] || undefined;
    const email = rowObj.email || rowObj["ایمیل"] || undefined;
    const phone = rowObj.phone || rowObj["موبایل"] || rowObj["تلفن"] || undefined;
    const tags = rowObj.tags || rowObj["برچسب"] || undefined;
    const isChild =
      (rowObj.child || rowObj["is child"] || rowObj["کودک"] || "").toLowerCase() === "true" ||
      (rowObj.child || rowObj["is child"] || rowObj["کودک"] || "").toLowerCase() === "yes" ||
      (rowObj.child || rowObj["is child"] || rowObj["کودک"] || "").toLowerCase() === "بله";
    const plusOnes =
      (rowObj.plusone || rowObj["plus one"] || rowObj["همراه"] || "").toLowerCase() === "true" ||
      (rowObj.plusone || rowObj["plus one"] || rowObj["همراه"] || "").toLowerCase() === "yes" ||
      (rowObj.plusone || rowObj["plus one"] || rowObj["همراه"] || "").toLowerCase() === "بله";

    rows.push({
      name,
      partyName,
      seats: Number.isNaN(seats) ? 1 : Math.max(1, seats),
      plusOnes,
      isChild,
      table,
      email,
      phone,
      tags,
    });
  }

  return rows;
}

/**
 * Builds CSV string prefixed with UTF-8 BOM (`\uFEFF`) so Microsoft Excel correctly displays
 * Persian / Arabic and unicode characters without manual encoding adjustments.
 */
export function buildCsvWithBom(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(",");
  const dataRows = rows.map((row) => row.map(escapeCell).join(","));

  // Prepend UTF-8 Byte Order Mark
  return "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
}

export interface CsvGuestExportRow {
  partyName: string;
  guestName: string;
  isChild: boolean;
  status: string;
  table: string;
  seats: number;
  dietary: string;
  allergyNotes: string;
  tags: string;
  inviteUrl: string;
  notes: string;
}

export function generateGuestsBomCsv(rows: CsvGuestExportRow[]): string {
  const headers = [
    "Party Name",
    "Guest Name",
    "Is Child",
    "Status",
    "Table",
    "Seats",
    "Dietary",
    "Allergy Notes",
    "Tags",
    "Invite URL",
    "Notes",
  ];
  const dataRows = rows.map((r) => [
    r.partyName,
    r.guestName,
    r.isChild ? "Yes" : "No",
    r.status,
    r.table,
    r.seats,
    r.dietary,
    r.allergyNotes,
    r.tags,
    r.inviteUrl,
    r.notes,
  ]);
  return buildCsvWithBom(headers, dataRows);
}
