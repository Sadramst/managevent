import { invitationStudioEn } from "@managevent/i18n";
import { HostEventCreateSchema, HostPartyCreateSchema } from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  countHouseholds,
  endLocal,
  type HouseholdRow,
  nextDay,
  parsePeople,
  toEventCreateInput,
  toFirstParties,
  validateBasics,
  validateHouseholds,
  type WizardBasics,
} from "./wizard";

const errors = invitationStudioEn.wizard.errors;
const guestCopy = invitationStudioEn.wizard.guests;
const today = "2026-11-12";

const basics: WizardBasics = {
  title: "  Sarah and Daniel's wedding ",
  hosts: "Sarah Chen and Daniel Morris",
  honoureeName: "",
  date: "2027-03-20",
  startTime: "16:30",
  endTime: "",
  timeZone: "Australia/Perth",
  venueName: "",
  venueAddress: "",
};

describe("wizard basics", () => {
  it("accepts a complete step and builds a body the contract accepts", () => {
    expect(validateBasics(basics, { today }, errors)).toEqual({});
    const input = toEventCreateInput({
      ceremonySlug: "wedding",
      templateSlug: "royal-classic",
      memorial: false,
      basics,
    });
    const parsed = HostEventCreateSchema.parse(input);
    expect(parsed.title).toBe("Sarah and Daniel's wedding");
    expect(parsed.startsAtLocal).toBe("2027-03-20T16:30");
    expect(parsed.endsAtLocal).toBeUndefined();
    expect(parsed.venue).toBeUndefined();
    expect(parsed.honoureeName).toBeUndefined();
  });

  it("explains each missing or impossible value beside its field", () => {
    const found = validateBasics(
      { ...basics, title: " ", hosts: "", date: "", startTime: "", venueAddress: "1 High St" },
      { today },
      errors,
    );
    expect(found).toEqual({
      title: errors.titleRequired,
      hosts: errors.hostsRequired,
      date: errors.dateRequired,
      startTime: errors.timeRequired,
      venueName: errors.venueNameRequired,
    });
    expect(validateBasics({ ...basics, date: "2027-02-30" }, { today }, errors).date).toBe(
      errors.dateInvalid,
    );
    expect(validateBasics({ ...basics, date: "2026-11-11" }, { today }, errors).date).toBe(
      errors.datePast,
    );
    expect(validateBasics({ ...basics, date: today }, { today }, errors).date).toBeUndefined();
    expect(validateBasics({ ...basics, endTime: "16:30" }, { today }, errors).endTime).toBe(
      errors.endBeforeStart,
    );
    expect(validateBasics({ ...basics, title: "x".repeat(161) }, { today }, errors).title).toBe(
      errors.titleTooLong,
    );
  });

  it("reads an end time before the start as the small hours of the next day", () => {
    expect(endLocal("2027-03-20", "16:30", "23:00")).toBe("2027-03-20T23:00");
    expect(endLocal("2027-03-20", "16:30", "00:30")).toBe("2027-03-21T00:30");
    expect(endLocal("2027-12-31", "18:00", "01:00")).toBe("2028-01-01T01:00");
    expect(endLocal("2027-03-20", "16:30", "")).toBeNull();
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });

  it("sends the venue, the end and (memorial only) the person remembered", () => {
    const full = {
      ...basics,
      endTime: "00:30",
      venueName: " Kings Park ",
      venueAddress: " Fraser Avenue ",
      honoureeName: " Margaret Ellis ",
    };
    const celebration = HostEventCreateSchema.parse(
      toEventCreateInput({
        ceremonySlug: "wedding",
        templateSlug: "royal-classic",
        memorial: false,
        basics: full,
      }),
    );
    expect(celebration.venue).toEqual({ name: "Kings Park", address: "Fraser Avenue" });
    expect(celebration.endsAtLocal).toBe("2027-03-21T00:30");
    expect(celebration.honoureeName).toBeUndefined();

    const memorial = HostEventCreateSchema.parse(
      toEventCreateInput({
        ceremonySlug: "celebration-of-life",
        templateSlug: "memorial-calm",
        memorial: true,
        basics: full,
      }),
    );
    expect(memorial.honoureeName).toBe("Margaret Ellis");
  });
});

describe("first households", () => {
  const rows: HouseholdRow[] = [
    {
      key: "11111111-aaaa",
      name: " The Nguyen family ",
      people: "Linh Nguyen, Tom Nguyen;\nMia  Nguyen",
    },
    { key: "22222222-bbbb", name: "Priya Sharma", people: "" },
    { key: "33333333-cccc", name: "", people: "  " },
  ];

  it("splits names on commas, semicolons and new lines", () => {
    expect(parsePeople("Linh Nguyen, Tom Nguyen;\nMia  Nguyen,,")).toEqual([
      "Linh Nguyen",
      "Tom Nguyen",
      "Mia Nguyen",
    ]);
    expect(parsePeople("   ")).toEqual([]);
  });

  it("ignores blank rows and counts one person for a name with no people", () => {
    expect(validateHouseholds(rows, guestCopy)).toEqual({});
    expect(countHouseholds(rows)).toEqual({ households: 2, guests: 4 });
  });

  it("builds party bodies the contract accepts, keyed for a safe retry", () => {
    const parties = toFirstParties(rows);
    expect(parties.map((party) => party.idempotencyKey)).toEqual([
      "11111111-aaaa",
      "22222222-bbbb",
    ]);
    const first = HostPartyCreateSchema.parse(parties[0]?.input);
    expect(first.displayName).toBe("The Nguyen family");
    expect(first.guests.map((guest) => guest.name)).toEqual([
      "Linh Nguyen",
      "Tom Nguyen",
      "Mia Nguyen",
    ]);
    const second = HostPartyCreateSchema.parse(parties[1]?.input);
    expect(second.guests).toEqual([]);
  });

  it("asks for a name when only people were typed, and caps a household at 20", () => {
    const crowd = Array.from({ length: 21 }, (_, index) => `Person ${index}`).join(",");
    const found = validateHouseholds(
      [
        { key: "a", name: "", people: "Sam" },
        { key: "b", name: "Big family", people: crowd },
        { key: "c", name: "x".repeat(121), people: "y".repeat(121) },
      ],
      guestCopy,
    );
    expect(found).toEqual({
      a: { name: guestCopy.nameRequired },
      b: { people: guestCopy.tooManyPeople },
      c: { name: guestCopy.nameTooLong, people: guestCopy.personTooLong },
    });
  });
});
