import { describe, expect, it } from "vitest";
import {
  buildCsvWithBom,
  buildGuestExportCsv,
  detectDelimiter,
  EXPORT_COLUMNS,
  EXPORT_HEALTH_COLUMNS,
  type ExportGuestRow,
  MAX_IMPORT_ROWS,
  parseCsv,
  planGuestImport,
} from "./csv.js";

describe("parseCsv (RFC 4180)", () => {
  it("reads plain rows with LF, CRLF and CR line endings", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(parseCsv("a,b\r1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores a UTF-8 byte order mark", () => {
    expect(parseCsv("\uFEFFname,email\nAda,ada@example.com")).toEqual([
      ["name", "email"],
      ["Ada", "ada@example.com"],
    ]);
  });

  it("keeps delimiters, doubled quotes and line breaks inside quoted fields", () => {
    const rows = parseCsv('name,notes\r\n"Smith, John","said ""hello""\r\nand left"\r\n');
    expect(rows).toEqual([
      ["name", "notes"],
      ["Smith, John", 'said "hello"\r\nand left'],
    ]);
  });

  it("keeps empty fields, including a trailing one and an empty quoted one", () => {
    expect(parseCsv('a,,c\n1,2,\n""')).toEqual([["a", "", "c"], ["1", "2", ""], [""]]);
  });

  it("uses a semicolon when the header row does", () => {
    expect(detectDelimiter("name;email;phone\n")).toBe(";");
    expect(detectDelimiter('"a;b",c\n')).toBe(",");
    expect(parseCsv("name;party\nAda Lovelace;Lovelace, family")).toEqual([
      ["name", "party"],
      ["Ada Lovelace", "Lovelace, family"],
    ]);
  });

  it("returns nothing for empty input and a one-field record for a blank line", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("a\n\nb")).toEqual([["a"], [""], ["b"]]);
  });
});

describe("planGuestImport", () => {
  it("groups rows that share a party value and keeps other rows as their own party", () => {
    const plan = planGuestImport(
      [
        "Guest Name,Party Name,Is Child,Seats,Table,Tags,Email,Phone,Plus One",
        "Ada Lovelace,Lovelace Family,no,4,Table 3,family; vip,ada@example.com,0412 345 678,yes",
        "Byron Lovelace,lovelace  family,YES,,,vip,,,",
        "Charles Babbage,,,,,,charles@example.com,,",
      ].join("\r\n"),
    );

    expect(plan.errors).toEqual([]);
    expect(plan.skippedRows).toBe(0);
    expect(plan.guestCount).toBe(3);
    expect(plan.parties).toEqual([
      {
        displayName: "Lovelace Family",
        maxSeats: 4,
        allowPlusOnes: true,
        tableLabel: "Table 3",
        tags: ["family", "vip"],
        guests: [
          { name: "Ada Lovelace", isChild: false, email: "ada@example.com", phone: "0412 345 678" },
          { name: "Byron Lovelace", isChild: true, email: null, phone: null },
        ],
      },
      {
        displayName: "Charles Babbage",
        maxSeats: 1,
        allowPlusOnes: false,
        tableLabel: null,
        tags: [],
        guests: [
          { name: "Charles Babbage", isChild: false, email: "charles@example.com", phone: null },
        ],
      },
    ]);
  });

  it("accepts the short header aliases and falls back to the first column for the name", () => {
    const aliases = planGuestImport(
      "name;group;child;max seats;table number;plusone\nAda;Team;true;3;7;1",
    );
    expect(aliases.parties[0]).toMatchObject({
      displayName: "Team",
      maxSeats: 3,
      tableLabel: "7",
      allowPlusOnes: true,
      guests: [{ name: "Ada", isChild: true }],
    });

    const noNameColumn = planGuestImport("who,email\nAda,ada@example.com");
    expect(noNameColumn.parties[0]?.guests[0]).toMatchObject({
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("does not merge two rows without a party value, even with the same name", () => {
    const plan = planGuestImport("name\nJohn Smith\nJohn Smith");
    expect(plan.parties).toHaveLength(2);
  });

  it("reports rows by their file row number and skips rows without a name", () => {
    const plan = planGuestImport(
      ["name,email,phone", "Ada,not-an-email,", "", ",ada@example.com,", "Byron,,12345"].join("\n"),
    );
    expect(plan.errors).toEqual([
      expect.objectContaining({ row: 2, code: "INVALID_EMAIL" }),
      expect.objectContaining({ row: 4, code: "MISSING_NAME" }),
      expect.objectContaining({ row: 5, code: "INVALID_PHONE" }),
    ]);
    // The invalid contact value is dropped; the guest is still imported.
    expect(plan.parties.map((party) => party.guests[0])).toEqual([
      { name: "Ada", isChild: false, email: null, phone: null },
      { name: "Byron", isChild: false, email: null, phone: null },
    ]);
    expect(plan.skippedRows).toBe(1);
  });

  it("caps a party at 20 guests and reports the rest", () => {
    const rows = Array.from({ length: 22 }, (_, index) => `Guest ${index + 1},Big Family`);
    const plan = planGuestImport(["name,party", ...rows].join("\n"));
    expect(plan.parties).toHaveLength(1);
    expect(plan.parties[0]?.guests).toHaveLength(20);
    expect(plan.parties[0]?.maxSeats).toBe(20);
    expect(plan.skippedRows).toBe(2);
    expect(plan.errors.map((error) => [error.row, error.code])).toEqual([
      [22, "PARTY_TOO_LARGE"],
      [23, "PARTY_TOO_LARGE"],
    ]);
  });

  it("stops at the row limit and says so once", () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 3 }, (_, index) => `Guest ${index + 1}`);
    const plan = planGuestImport(["name", ...rows].join("\n"));
    expect(plan.tooManyRows).toBe(true);
    expect(plan.guestCount).toBe(MAX_IMPORT_ROWS);
    expect(plan.skippedRows).toBe(3);
    expect(plan.errors).toEqual([
      expect.objectContaining({ row: MAX_IMPORT_ROWS + 2, code: "TOO_MANY_ROWS" }),
    ]);
  });

  it("returns an empty plan for a header-only or empty file", () => {
    for (const csv of ["", "name,email", "name,email\n\n"]) {
      const plan = planGuestImport(csv);
      expect(plan.parties).toEqual([]);
      expect(plan.errors).toEqual([]);
      expect(plan.tooManyRows).toBe(false);
    }
  });
});

describe("CSV export", () => {
  const row: ExportGuestRow = {
    partyName: "Lovelace Family",
    guestName: 'Ada "Countess" Lovelace',
    isChild: false,
    isPlusOne: false,
    status: "YES",
    respondedAt: "01/12/2026 09:30",
    table: "Table 3",
    seats: 4,
    tags: ["family", "vip"],
    email: "ada@example.com",
    phone: "+61412345678",
    checkedIn: true,
    invitePath: "/i/test-event-abcd/lovelace-family-k7m2p9qx",
    health: {
      dietary: ["VEGAN", "NUT_ALLERGY"],
      allergySeverity: "SEVERE_ANAPHYLAXIS",
      allergyNotes: "Carries an adrenaline pen",
      accessibilityNotes: "",
    },
  };

  it("starts with a BOM, quotes every cell and ends lines with CRLF", () => {
    const csv = buildCsvWithBom(
      ["A", "B"],
      [
        ["x", 2],
        [null, true],
      ],
    );
    expect(csv).toBe('\uFEFF"A","B"\r\n"x","2"\r\n"","true"\r\n');
  });

  it("neutralises cells a spreadsheet would run as a formula", () => {
    const csv = buildCsvWithBom(
      ["Name"],
      [["=HYPERLINK(1)"], ["+61"], ["-2+3"], ["@SUM(A1)"], ["\tx"]],
    );
    const cells = parseCsv(csv)
      .slice(1)
      .map((record) => record[0]);
    expect(cells).toEqual(["'=HYPERLINK(1)", "'+61", "'-2+3", "'@SUM(A1)", "'\tx"]);
    // Numbers are data, not text, and stay as they are.
    expect(buildCsvWithBom(["N"], [[-5]])).toContain('"-5"');
  });

  it("writes the agreed columns and leaves health columns out unless asked", () => {
    const withoutHealth = parseCsv(buildGuestExportCsv([row], false));
    expect(withoutHealth[0]).toEqual([...EXPORT_COLUMNS]);
    expect(withoutHealth[1]).toEqual([
      "Lovelace Family",
      'Ada "Countess" Lovelace',
      "No",
      "No",
      "YES",
      "01/12/2026 09:30",
      "Table 3",
      "4",
      "family; vip",
      "ada@example.com",
      "'+61412345678",
      "Yes",
      "/i/test-event-abcd/lovelace-family-k7m2p9qx",
    ]);
    const text = buildGuestExportCsv([row], false);
    for (const secret of ["VEGAN", "SEVERE_ANAPHYLAXIS", "adrenaline", "Dietary", "Allergy"]) {
      expect(text).not.toContain(secret);
    }

    const withHealth = parseCsv(buildGuestExportCsv([row], true));
    expect(withHealth[0]).toEqual([...EXPORT_COLUMNS, ...EXPORT_HEALTH_COLUMNS]);
    expect(withHealth[1]?.slice(EXPORT_COLUMNS.length)).toEqual([
      "VEGAN; NUT_ALLERGY",
      "SEVERE_ANAPHYLAXIS",
      "Carries an adrenaline pen",
      "",
    ]);
  });

  it("round-trips: an exported file imports back to the same guests", () => {
    const plan = planGuestImport(buildGuestExportCsv([row], false));
    expect(plan.errors).toEqual([]);
    expect(plan.parties).toEqual([
      {
        displayName: "Lovelace Family",
        maxSeats: 4,
        allowPlusOnes: false,
        tableLabel: "Table 3",
        tags: ["family", "vip"],
        guests: [
          {
            name: 'Ada "Countess" Lovelace',
            isChild: false,
            email: "ada@example.com",
            phone: "+61412345678",
          },
        ],
      },
    ]);
  });
});
