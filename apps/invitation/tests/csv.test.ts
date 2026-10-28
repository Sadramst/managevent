import { describe, it, expect } from "vitest";
import { parseGuestsCsv, generateGuestsBomCsv, type CsvGuestExportRow } from "../lib/csv-helper";

describe("CSV Import & Export with UTF-8 BOM", () => {
  it("parses CSV with English headers", () => {
    const csv = `Name,Seats,Table,Tags
John Doe,2,Table 1,VIP
Jane Smith,1,Table 2,Family`;

    const rows = parseGuestsCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.name).toBe("John Doe");
    expect(rows[0]!.seats).toBe(2);
    expect(rows[0]!.table).toBe("Table 1");
    expect(rows[0]!.tags).toBe("VIP");
  });

  it("parses CSV with Persian headers", () => {
    const csv = `نام,تعداد,میز,گروه
آرمیتا و حسام,2,میز ۱,خانواده
دکتر سارا جنکینز,1,میز ۲,مهمان ویژه`;

    const rows = parseGuestsCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.name).toBe("آرمیتا و حسام");
    expect(rows[0]!.seats).toBe(2);
    expect(rows[0]!.table).toBe("میز ۱");
  });

  it("generates CSV with mandatory UTF-8 BOM (\\uFEFF) for Excel compatibility", () => {
    const sampleRows: CsvGuestExportRow[] = [
      {
        partyName: "آرمیتا و حسام",
        guestName: "آرمیتا",
        isChild: false,
        status: "YES",
        table: "Table 1",
        seats: 2,
        dietary: "VEGAN",
        allergyNotes: "No peanuts",
        tags: "VIP",
        inviteUrl: "https://invitation.managevent.com.au/i/anniversary/armita-party-g9qtmt",
        notes: "Happy anniversary!",
      },
    ];

    const csvOutput = generateGuestsBomCsv(sampleRows);

    // Must start with UTF-8 BOM
    expect(csvOutput.charCodeAt(0)).toBe(0xfeff);

    // Contains Farsi text preserved
    expect(csvOutput).toContain("آرمیتا و حسام");
    expect(csvOutput).toContain("VEGAN");
    expect(csvOutput).toContain("Table 1");
  });
});
