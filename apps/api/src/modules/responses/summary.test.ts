import { DietaryMatrixSchema, ResponsesSummarySchema } from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  buildDietaryMatrix,
  buildResponsesSummary,
  describeDeadline,
  type ResponseGuest,
  type ResponseParty,
} from "./summary.js";

let sequence = 0;
function guest(overrides: Partial<ResponseGuest> = {}): ResponseGuest {
  sequence += 1;
  return {
    guestId: `gst_018f2f6e-7c1a-7b3c-9d2e-${String(sequence).padStart(12, "0")}`,
    name: `Guest ${sequence}`,
    isChild: false,
    status: "PENDING",
    respondedAt: null,
    dietary: [],
    allergySeverity: null,
    allergyNotes: null,
    accessibilityNotes: null,
    songRequests: [],
    messageToHost: null,
    checkedIn: false,
    ...overrides,
  };
}

const at = (iso: string) => new Date(iso);

const parties: ResponseParty[] = [
  {
    displayName: "Lovelace Family",
    tableLabel: "Table 10",
    guests: [
      guest({
        name: "Ada",
        status: "YES",
        respondedAt: at("2026-11-03T01:00:00.000Z"),
        dietary: ["VEGAN", "NUT_ALLERGY", "VEGAN"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        allergyNotes: "Carries an adrenaline pen",
        songRequests: ["Dancing Queen", "  "],
        messageToHost: "Cannot wait!",
        checkedIn: true,
      }),
      guest({
        name: "Byron",
        isChild: true,
        status: "YES",
        respondedAt: at("2026-11-03T01:00:00.000Z"),
        dietary: ["NONE"],
      }),
      guest({ name: "Late", status: "PENDING" }),
    ],
  },
  {
    displayName: "Babbage",
    tableLabel: "Table 2",
    guests: [
      guest({
        name: "Charles",
        status: "NO",
        respondedAt: at("2026-11-05T01:00:00.000Z"),
        // A guest who declined is not catered for, whatever they entered.
        dietary: ["HALAL"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        messageToHost: "Sorry to miss it",
      }),
    ],
  },
  {
    displayName: "Hopper",
    tableLabel: null,
    guests: [
      guest({ name: "Grace", status: "MAYBE", respondedAt: at("2026-11-04T01:00:00.000Z") }),
      guest({
        name: "Plus",
        status: "YES",
        respondedAt: at("2026-11-04T02:00:00.000Z"),
        dietary: ["HALAL"],
        accessibilityNotes: "Wheelchair user",
      }),
    ],
  },
  { displayName: "Silent", tableLabel: "Table 2", guests: [guest({ name: "Silent" })] },
];

const context = {
  now: at("2026-11-10T04:00:00.000Z"),
  timeZone: "Australia/Perth",
  rsvpDeadline: at("2026-11-20T15:59:00.000Z"),
  latestHeadcount: null,
  linkedOrder: false,
};

describe("buildResponsesSummary", () => {
  const summary = buildResponsesSummary(parties, context);

  it("satisfies the response schema", () => {
    expect(() => ResponsesSummarySchema.parse(summary)).not.toThrow();
  });

  it("counts guests the same way the headcount snapshot does", () => {
    expect(summary.totals).toEqual({
      parties: 4,
      partiesResponded: 3,
      guests: 7,
      adultsYes: 2,
      childrenYes: 1,
      maybe: 1,
      no: 1,
      pending: 2,
      checkedIn: 1,
    });
  });

  it("counts dietary tags for attending guests only, once per guest, never NONE", () => {
    expect(summary.dietaryCounts).toEqual({
      HALAL: 1,
      VEGETARIAN: 0,
      VEGAN: 1,
      GLUTEN_FREE: 0,
      DAIRY_FREE: 0,
      KOSHER: 0,
      NUT_ALLERGY: 1,
      SHELLFISH_ALLERGY: 0,
      OTHER_ALLERGY: 0,
    });
    expect(summary.severeAllergyCount).toBe(1);
  });

  it("lists songs and messages by party, newest message first, and the latest ten responses", () => {
    expect(summary.songRequests).toEqual([
      { partyDisplayName: "Lovelace Family", song: "Dancing Queen" },
    ]);
    expect(summary.messages.map((entry) => [entry.partyDisplayName, entry.message])).toEqual([
      ["Babbage", "Sorry to miss it"],
      ["Lovelace Family", "Cannot wait!"],
    ]);
    expect(summary.recent).toEqual([
      { partyDisplayName: "Babbage", status: "NO", respondedAt: "2026-11-05T01:00:00.000Z" },
      { partyDisplayName: "Hopper", status: "YES", respondedAt: "2026-11-04T02:00:00.000Z" },
      {
        partyDisplayName: "Lovelace Family",
        status: "YES",
        respondedAt: "2026-11-03T01:00:00.000Z",
      },
    ]);

    const many: ResponseParty[] = Array.from({ length: 14 }, (_, index) => ({
      displayName: `Party ${index}`,
      tableLabel: null,
      guests: [guest({ status: "YES", respondedAt: new Date(Date.UTC(2026, 10, 1 + index)) })],
    }));
    const recent = buildResponsesSummary(many, context).recent;
    expect(recent).toHaveLength(10);
    expect(recent[0]?.partyDisplayName).toBe("Party 13");
  });

  it("handles an event with no guests", () => {
    const empty = buildResponsesSummary([], { ...context, rsvpDeadline: null });
    expect(empty.totals.guests).toBe(0);
    expect(empty.recent).toEqual([]);
    expect(empty.deadline).toEqual({
      rsvpDeadline: null,
      rsvpDeadlineLocal: null,
      state: "NONE",
      days: null,
    });
  });
});

describe("describeDeadline", () => {
  const deadline = at("2026-11-20T15:59:00.000Z"); // 23:59 on 20 November in Perth

  it("counts whole calendar days in the event's time zone", () => {
    expect(describeDeadline(deadline, at("2026-11-10T04:00:00.000Z"), "Australia/Perth")).toEqual({
      rsvpDeadline: "2026-11-20T15:59:00.000Z",
      rsvpDeadlineLocal: "2026-11-20T23:59",
      state: "OPEN",
      days: 10,
    });
    // 00:30 on the 20th in Perth is still the 19th in UTC.
    expect(
      describeDeadline(deadline, at("2026-11-19T16:30:00.000Z"), "Australia/Perth"),
    ).toMatchObject({
      state: "DUE_TODAY",
      days: 0,
    });
    expect(
      describeDeadline(deadline, at("2026-11-20T16:00:00.000Z"), "Australia/Perth"),
    ).toMatchObject({
      state: "CLOSED",
      days: -1,
    });
    expect(
      describeDeadline(deadline, at("2026-11-23T04:00:00.000Z"), "Australia/Perth"),
    ).toMatchObject({
      state: "CLOSED",
      days: -3,
    });
  });
});

describe("buildDietaryMatrix", () => {
  const matrix = buildDietaryMatrix(parties);

  it("satisfies the response schema", () => {
    expect(() => DietaryMatrixSchema.parse(matrix)).not.toThrow();
  });

  it("lists attending guests who gave any health detail, with their table", () => {
    expect(matrix.rows.map((row) => [row.guestName, row.partyDisplayName, row.tableLabel])).toEqual(
      [
        ["Ada", "Lovelace Family", "Table 10"],
        ["Plus", "Hopper", null],
      ],
    );
    expect(matrix.rows[0]).toMatchObject({
      dietary: ["VEGAN", "NUT_ALLERGY"],
      allergySeverity: "SEVERE_ANAPHYLAXIS",
      allergyNotes: "Carries an adrenaline pen",
      accessibilityNotes: null,
    });
    expect(matrix.rows[1]).toMatchObject({
      dietary: ["HALAL"],
      allergySeverity: null,
      accessibilityNotes: "Wheelchair user",
    });
  });

  it("totals per table in natural order with unassigned guests last", () => {
    expect(matrix.counts).toMatchObject({ HALAL: 1, VEGAN: 1, NUT_ALLERGY: 1, KOSHER: 0 });
    expect(matrix.byTable.map((table) => [table.tableLabel, table.severe])).toEqual([
      ["Table 10", 1],
      [null, 0],
    ]);
    expect(matrix.byTable[0]?.counts).toMatchObject({ VEGAN: 1, NUT_ALLERGY: 1, HALAL: 0 });
    expect(matrix.byTable[1]?.counts).toMatchObject({ HALAL: 1 });

    const ordered = buildDietaryMatrix([
      { displayName: "A", tableLabel: null, guests: [guest({ status: "YES" })] },
      { displayName: "B", tableLabel: "Table 10", guests: [guest({ status: "YES" })] },
      { displayName: "C", tableLabel: "Table 2", guests: [guest({ status: "YES" })] },
    ]);
    expect(ordered.byTable.map((table) => table.tableLabel)).toEqual(["Table 2", "Table 10", null]);
    expect(ordered.rows).toEqual([]);
  });
});
