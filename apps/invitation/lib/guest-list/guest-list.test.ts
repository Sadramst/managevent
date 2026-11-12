import { getInvitationStudioGuests } from "@managevent/i18n";
import { describe, expect, it } from "vitest";
import { buildCsvTemplate, CSV_TEMPLATE_HEADER, csvDataUrl } from "./csv-template";
import { deadlineText } from "./deadline";
import { type DoorGuest, doorTotals, filterDoorGuests } from "./door";
import { toDoorRoster } from "./door-load";
import { fill, fillCount } from "./fill";
import {
  formatInstantDate,
  formatInstantLong,
  formatInstantShort,
  formatInstantTime,
  instantToLocal,
} from "./instants";
import { toEmailPartyView, toLinkPartyView, toPartyView } from "./load";
import { inviteMessageTemplate, personalise, reminderMessageTemplate } from "./messages";
import { newUuid } from "./uuid";
import {
  collectTags,
  fileSlug,
  filterParties,
  guestListTotals,
  hasPendingGuest,
  matchesQuery,
  parseTags,
  type PartyView,
  tableLabelText,
  tagsAreValid,
} from "./view";
import { looksLikeAuPhone, toWhatsAppNumber, whatsAppUrl } from "./whatsapp";

const copy = getInvitationStudioGuests("en");

function party(overrides: Partial<PartyView> & { displayName: string }): PartyView {
  return {
    id: `pty_${overrides.displayName}`,
    inviteUrl: "http://localhost:3001/i/sample-event-ab12/sample-guest-abcd2345",
    linkOff: false,
    maxSeats: 2,
    allowPlusOnes: false,
    childrenAllowed: true,
    tags: [],
    tableLabel: null,
    status: "PENDING",
    repliedOn: null,
    hasEmail: false,
    emailedOn: null,
    remindersSent: 0,
    phone: null,
    guests: [],
    ...overrides,
  };
}

const guest = (name: string, status: PartyView["status"] = "PENDING", extra = {}) => ({
  id: `gst_${name}`,
  name,
  email: null,
  phone: null,
  isChild: false,
  isPlusOne: false,
  status,
  checkedIn: false,
  ...extra,
});

const parties: PartyView[] = [
  party({
    displayName: "The Nguyen family",
    status: "YES",
    tags: ["Family", "Interstate"],
    tableLabel: "3",
    guests: [guest("Anh Nguyen", "YES", { email: "anh@example.org" }), guest("Bảo Nguyễn", "YES")],
  }),
  party({ displayName: "Sam Taylor", tags: ["Work"], guests: [guest("Sam Taylor")] }),
  party({
    displayName: "Zoë Müller",
    status: "NO",
    tags: ["Family"],
    guests: [guest("Zoë Müller", "NO")],
  }),
];

describe("fill", () => {
  it("fills placeholders and leaves unknown ones in place", () => {
    expect(fill("{a} and {b}", { a: "one" })).toBe("one and {b}");
  });

  it("chooses singular or plural by count", () => {
    expect(fillCount(1, "1 guest", "{count} guests")).toBe("1 guest");
    expect(fillCount(4, "1 guest", "{count} guests")).toBe("4 guests");
  });
});

describe("WhatsApp links", () => {
  it("turns Australian mobiles into international digits", () => {
    expect(toWhatsAppNumber("0412 345 678")).toBe("61412345678");
    expect(toWhatsAppNumber("+61 412 345 678")).toBe("61412345678");
    expect(toWhatsAppNumber("61412345678")).toBe("61412345678");
    expect(toWhatsAppNumber("(0412) 345-678")).toBe("61412345678");
  });

  it("does not guess for landlines, foreign or missing numbers", () => {
    expect(toWhatsAppNumber("08 9321 0000")).toBeNull();
    expect(toWhatsAppNumber("+44 7700 900123")).toBeNull();
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
  });

  it("opens the chat when there is a mobile, the contact picker otherwise", () => {
    expect(whatsAppUrl("0412 345 678", "Hello & welcome")).toBe(
      "https://wa.me/61412345678?text=Hello%20%26%20welcome",
    );
    expect(whatsAppUrl(null, "Line one\nLine two")).toBe(
      "https://wa.me/?text=Line%20one%0ALine%20two",
    );
  });

  it("recognises the phone shapes the API accepts", () => {
    expect(looksLikeAuPhone("0412 345 678")).toBe(true);
    expect(looksLikeAuPhone("+61412345678")).toBe(true);
    expect(looksLikeAuPhone("08 9321 0000")).toBe(true);
    expect(looksLikeAuPhone("12345")).toBe(false);
    expect(looksLikeAuPhone("0512 345 678")).toBe(false);
  });
});

describe("guest list filtering", () => {
  it("matches every word, ignoring case and accents", () => {
    const [nguyen, , zoe] = parties as [PartyView, PartyView, PartyView];
    expect(matchesQuery(nguyen, "bao nguyen")).toBe(true);
    expect(matchesQuery(nguyen, "ANH@EXAMPLE")).toBe(true);
    expect(matchesQuery(nguyen, "interstate 3")).toBe(true);
    expect(matchesQuery(nguyen, "nguyen taylor")).toBe(false);
    expect(matchesQuery(zoe, "zoe muller")).toBe(true);
    expect(matchesQuery(zoe, "   ")).toBe(true);
  });

  it("combines search, reply and tag filters", () => {
    expect(filterParties(parties, { query: "", status: "", tag: "" })).toHaveLength(3);
    expect(filterParties(parties, { query: "", status: "PENDING", tag: "" })).toEqual([parties[1]]);
    expect(
      filterParties(parties, { query: "", status: "", tag: "Family" }).map((p) => p.displayName),
    ).toEqual(["The Nguyen family", "Zoë Müller"]);
    expect(filterParties(parties, { query: "zoe", status: "YES", tag: "Family" })).toEqual([]);
  });

  it("collects tags and totals", () => {
    expect(collectTags(parties)).toEqual(["Family", "Interstate", "Work"]);
    expect(guestListTotals(parties)).toEqual({
      households: 3,
      guests: 4,
      attending: 2,
      awaiting: 1,
    });
  });

  it("parses and validates a tags field", () => {
    expect(parseTags(" Family, interstate ;family,\nWork ,, ")).toEqual([
      "Family",
      "interstate",
      "Work",
    ]);
    expect(tagsAreValid(parseTags("a,b,c"))).toBe(true);
    expect(tagsAreValid(Array.from({ length: 11 }, (_, index) => `tag ${index}`))).toBe(false);
    expect(tagsAreValid(["x".repeat(41)])).toBe(false);
  });

  it("labels tables without doubling the word", () => {
    expect(tableLabelText("3", copy.common.table)).toBe("Table 3");
    expect(tableLabelText("Head table", copy.common.table)).toBe("Head table");
    expect(tableLabelText("Table 12", copy.common.table)).toBe("Table 12");
    expect(tableLabelText("7B", copy.common.table)).toBe("Table 7B");
    expect(tableLabelText("Row 2", copy.common.table)).toBe("Row 2");
    expect(tableLabelText("Garden room", copy.common.table)).toBe("Garden room");
  });

  it("makes a safe file name from a household name", () => {
    expect(fileSlug("The Nguyễn family!")).toBe("the-nguyen-family");
    expect(fileSlug("…")).toBe("guest");
  });
});

describe("toPartyView", () => {
  const dto = {
    id: "pty_01a1d02f-0f46-7af4-a260-260a82a74d40",
    displayName: "Sam Taylor",
    token: "sam-taylor-abcd2345",
    invitePath: "/i/sample-event-ab12/sam-taylor-abcd2345",
    tokenRevokedAt: null,
    maxSeats: 2,
    allowPlusOnes: true,
    childrenAllowed: true,
    tags: ["Work"],
    tableLabel: null,
    status: "YES" as const,
    respondedAt: "2026-11-12T16:30:00.000Z",
    email: { hasAddress: true, inviteSentAt: "2026-11-01T02:00:00.000Z", remindersSent: 1 },
    guests: [
      {
        id: "gst_01a1d02f-0f46-7af4-a260-260a82a74d41",
        name: "Sam Taylor",
        email: "sam@example.org",
        phone: null,
        isChild: false,
        isPlusOne: false,
        status: "YES" as const,
        respondedAt: "2026-11-12T16:30:00.000Z",
        checkedInAt: null,
      },
      {
        id: "gst_01a1d02f-0f46-7af4-a260-260a82a74d42",
        name: "Guest of Sam",
        email: null,
        phone: "0412 345 678",
        isChild: false,
        isPlusOne: true,
        status: "YES" as const,
        respondedAt: "2026-11-12T16:30:00.000Z",
        checkedInAt: "2027-03-20T08:05:00.000Z",
      },
    ],
    createdAt: "2026-10-01T00:00:00.000Z",
  };

  it("formats dates in the event's time zone and builds the absolute link", () => {
    const view = toPartyView(dto, "Australia/Perth");
    // 16:30 UTC is 00:30 the next day in Perth.
    expect(view.repliedOn).toBe("13 November 2026");
    expect(view.emailedOn).toBe("1 November 2026");
    expect(view.inviteUrl).toMatch(/\/i\/sample-event-ab12\/sam-taylor-abcd2345$/);
    expect(view.phone).toBe("0412 345 678");
    expect(view.guests.map((g) => g.checkedIn)).toEqual([false, true]);
    expect(view.linkOff).toBe(false);
  });

  it("hides the link for a read-only co-host and flags a link that is off", () => {
    const view = toPartyView(
      { ...dto, token: null, invitePath: null, tokenRevokedAt: "2026-11-02T00:00:00.000Z" },
      "Australia/Perth",
    );
    expect(view.inviteUrl).toBeNull();
    expect(view.linkOff).toBe(true);
  });

  it("gives the Share and Awaiting screens the link but no email address", () => {
    const view = toLinkPartyView(dto, "Australia/Perth");
    expect(view.inviteUrl).toMatch(/\/i\/sample-event-ab12\/sam-taylor-abcd2345$/);
    expect(view.emailedOn).toBe("1 November 2026");
    expect(view.remindersSent).toBe(1);
    // One number, for the WhatsApp button. Nothing else about how to reach anyone.
    expect(view.phone).toBe("0412 345 678");
    expect(view.guests).toEqual([
      { id: dto.guests[0]?.id, name: "Sam Taylor", isChild: false, status: "YES" },
      { id: dto.guests[1]?.id, name: "Guest of Sam", isChild: false, status: "YES" },
    ]);
    const serialised = JSON.stringify(view);
    expect(serialised).not.toContain("sam@example.org");
    expect(serialised).not.toContain('"email"');
    expect(serialised.split("0412 345 678")).toHaveLength(2);
    // The search box on those screens still finds a household by a guest's name.
    expect(matchesQuery(view, "guest of sam")).toBe(true);
  });

  it("gives the email list a name to tick: no link, no token, no contact details", () => {
    const view = toEmailPartyView(dto, "Australia/Perth");
    expect(view).toEqual({
      id: dto.id,
      displayName: "Sam Taylor",
      linkOff: false,
      emailedOn: "1 November 2026",
    });
    const serialised = JSON.stringify(view);
    for (const secret of ["sam-taylor-abcd2345", "sam@example.org", "0412 345 678"]) {
      expect(serialised).not.toContain(secret);
    }
  });
});

describe("hasPendingGuest (the Awaiting replies list)", () => {
  it("keeps a household that has answered while one of its members has not", () => {
    // Anna and Tom said yes, so the household's own status is YES; Grandma was added later.
    const household = party({
      displayName: "The Okafor family",
      status: "YES",
      guests: [guest("Anna", "YES"), guest("Tom", "YES"), guest("Grandma", "PENDING")],
    });
    expect(hasPendingGuest(household)).toBe(true);
    // The household-status filter the page used to rely on would have dropped it.
    expect(filterParties([household], { query: "", status: "PENDING", tag: "" })).toEqual([]);
  });

  it("drops a household once everyone in it has answered, whatever they said", () => {
    expect(
      hasPendingGuest(
        party({
          displayName: "Sam Taylor",
          status: "YES",
          guests: [guest("Sam", "YES"), guest("Alex", "NO"), guest("Kim", "MAYBE")],
        }),
      ),
    ).toBe(false);
    expect(hasPendingGuest(party({ displayName: "Nobody yet" }))).toBe(false);
  });
});

describe("instants", () => {
  it("converts an instant to the event's wall clock", () => {
    expect(instantToLocal("2026-11-12T08:30:00.000Z", "Australia/Perth")).toBe("2026-11-12T16:30");
    expect(instantToLocal("2026-11-12T16:00:00.000Z", "Australia/Perth")).toBe("2026-11-13T00:00");
    // Sydney is on daylight saving time in January (UTC+11).
    expect(instantToLocal("2027-01-10T13:15:00.000Z", "Australia/Sydney")).toBe("2027-01-11T00:15");
    expect(instantToLocal("not a date", "Australia/Perth")).toBeNull();
  });

  it("formats in en-AU, deterministically", () => {
    const iso = "2026-11-12T08:30:00.000Z";
    expect(formatInstantShort(iso, "Australia/Perth")).toBe("12/11/2026, 4:30 PM");
    expect(formatInstantDate(iso, "Australia/Perth")).toBe("12 November 2026");
    expect(formatInstantTime(iso, "Australia/Perth")).toBe("4:30 PM");
    expect(formatInstantLong(iso, "Australia/Perth")).toBe("Thursday, 12 November 2026 at 4:30 PM");
  });

  it("falls back to UTC for an unknown time zone instead of throwing", () => {
    expect(instantToLocal("2026-11-12T08:30:00.000Z", "Mars/Olympus")).toBe("2026-11-12T08:30");
  });
});

describe("messages", () => {
  const event = {
    title: "Amelia and Rohan's wedding",
    date: "Saturday, 20 March 2027",
    hosts: "Amelia Hart and Rohan Mehta",
    memorial: false,
  };

  it("fills the event and leaves the household for later", () => {
    const template = inviteMessageTemplate(copy.share.message, event, { allowForwarding: true });
    expect(template).toContain("Amelia and Rohan's wedding on Saturday, 20 March 2027");
    expect(template).toContain("{name}");
    expect(template).toContain("{link}");
    expect(template).not.toContain("do not pass it on");
    const message = personalise(template, "Sam", "https://invitation.example/i/a/b");
    expect(message.startsWith("Hello Sam,")).toBe(true);
    expect(message).toContain("https://invitation.example/i/a/b");
    expect(message).not.toMatch(/\{[a-z]+\}/i);
  });

  it("asks guests not to forward a private invitation", () => {
    const template = inviteMessageTemplate(copy.share.message, event, { allowForwarding: false });
    expect(template).toContain("please do not pass it on");
  });

  it("uses calm wording for a memorial, with no celebration language", () => {
    const memorial = { ...event, title: "A service for Margaret Ellis", memorial: true };
    for (const allowForwarding of [true, false]) {
      const template = inviteMessageTemplate(copy.share.message, memorial, { allowForwarding });
      expect(template.startsWith("Dear {name},")).toBe(true);
      expect(template).not.toMatch(/invited|celebrat|party|excited|!/i);
    }
    const reminder = reminderMessageTemplate(copy.awaiting.reminder, memorial, "5 February 2027");
    expect(reminder).toContain("by 5 February 2027");
    expect(reminder).not.toMatch(/quick reminder|only takes a minute|!/i);
  });

  it("mentions the reply-by date only when there is one", () => {
    expect(reminderMessageTemplate(copy.awaiting.reminder, event, null)).not.toContain(
      "{deadline}",
    );
    expect(reminderMessageTemplate(copy.awaiting.reminder, event, "1 March 2027")).toContain(
      "by 1 March 2027",
    );
  });
});

describe("CSV template", () => {
  it("uses the column names the import understands and CRLF line ends", () => {
    const csv = buildCsvTemplate(copy.importCsv.templateRows);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("name,party,email,phone,child,seats,table,tags,plus one");
    expect(lines).toHaveLength(copy.importCsv.templateRows.length + 2);
    for (const row of copy.importCsv.templateRows) {
      expect(row).toHaveLength(CSV_TEMPLATE_HEADER.length);
    }
  });

  it("quotes cells that need it", () => {
    expect(buildCsvTemplate([['Smith, "Jo"', "", "", "", "", "", "", "", ""]])).toContain(
      '"Smith, ""Jo""",',
    );
  });

  it("builds a data URL with a byte order mark for Excel", () => {
    expect(csvDataUrl("a,b")).toBe("data:text/csv;charset=utf-8,%EF%BB%BFa%2Cb");
  });
});

describe("door list", () => {
  const door = (name: string, extra: Partial<DoorGuest> = {}): DoorGuest => ({
    guestId: `gst_${name}`,
    name,
    isChild: false,
    household: "The Ellis family",
    tableLabel: null,
    status: "YES",
    arrivedAt: null,
    severeAllergy: false,
    dietaryFlags: [],
    ...extra,
  });
  const guests = [
    door("Thomas Ellis", { arrivedAt: "10:45 AM" }),
    door("Ruth Ellis"),
    door("Amara Okafor", { household: "Dr Amara Okafor", status: "NO" }),
    door("James Whitlock", { household: "James Whitlock", status: "PENDING", tableLabel: "4" }),
  ];

  it("counts expected (said yes) and checked in", () => {
    expect(doorTotals(guests)).toEqual({ expected: 2, checkedIn: 1 });
  });

  it("filters by search and by arrival", () => {
    expect(filterDoorGuests(guests, "ellis", "all").map((g) => g.name)).toEqual([
      "Thomas Ellis",
      "Ruth Ellis",
    ]);
    expect(filterDoorGuests(guests, "", "arrived").map((g) => g.name)).toEqual(["Thomas Ellis"]);
    expect(filterDoorGuests(guests, "", "waiting")).toHaveLength(3);
    expect(filterDoorGuests(guests, "4", "all").map((g) => g.name)).toEqual(["James Whitlock"]);
  });

  it("maps the API roster: sorted by name, times in the event zone, flags only", () => {
    const roster = toDoorRoster({
      event: {
        title: "A service for Margaret Ellis",
        startsAt: "2027-02-12T03:00:00.000Z",
        startsAtLocal: "2027-02-12T11:00",
        timeZone: "Australia/Perth",
      },
      totals: { expected: 1, checkedIn: 1 },
      guests: [
        {
          guestId: "gst_01a1d02f-0f46-7af4-a260-260a82a74d42",
          name: "Ruth Ellis",
          isChild: false,
          partyDisplayName: "The Ellis family",
          partySize: 2,
          tableLabel: "Family",
          status: "YES",
          checkedInAt: "2027-02-12T02:45:00.000Z",
          severeAllergy: true,
          dietaryFlags: ["NUT_ALLERGY"],
        },
        {
          guestId: "gst_01a1d02f-0f46-7af4-a260-260a82a74d41",
          name: "Amara Okafor",
          isChild: false,
          partyDisplayName: "Dr Amara Okafor",
          partySize: 1,
          tableLabel: null,
          status: "NO",
          checkedInAt: null,
          severeAllergy: false,
          dietaryFlags: [],
        },
      ],
    });
    expect(roster.startsOn).toBe("Friday, 12 February 2027 at 11:00 AM");
    expect(roster.guests.map((g) => g.name)).toEqual(["Amara Okafor", "Ruth Ellis"]);
    expect(roster.guests[1]).toMatchObject({
      arrivedAt: "10:45 AM",
      severeAllergy: true,
      dietaryFlags: ["NUT_ALLERGY"],
      household: "The Ellis family",
    });
    // Nothing but flags reaches the door: no notes field exists on the view at all.
    expect(Object.keys(roster.guests[1] ?? {})).not.toContain("allergyNotes");
  });
});

describe("newUuid", () => {
  it("makes distinct RFC 4122 version 4 ids", () => {
    const a = newUuid();
    const b = newUuid();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});

describe("copy", () => {
  const flatten = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(flatten)
        : value && typeof value === "object"
          ? Object.values(value).flatMap(flatten)
          : [];
  const strings = flatten(copy);

  it("never mentions features that do not exist", () => {
    for (const text of strings) {
      expect(text).not.toMatch(/\bSMS\b|wallet|photo wall|\bAI\b|Persian|bilingual|text message/i);
    }
  });

  it("is plain sentence case with no jargon", () => {
    for (const text of strings) {
      expect(text).not.toMatch(/\b(RSVP'd|leverage|seamless|unlock|supercharge)\b/i);
    }
  });

  it("has a label for every reply status, dietary tag and import error the API can send", () => {
    expect(Object.keys(copy.common.status).sort()).toEqual(["MAYBE", "NO", "PENDING", "YES"]);
    expect(Object.keys(copy.common.dietary)).toHaveLength(10);
    expect(Object.keys(copy.importCsv.errors).sort()).toEqual([
      "INVALID_EMAIL",
      "INVALID_PHONE",
      "MISSING_NAME",
      "PARTY_TOO_LARGE",
      "TOO_MANY_ROWS",
    ]);
    expect(Object.keys(copy.share.email.skipped).sort()).toEqual([
      "ALREADY_SENT",
      "LINK_REVOKED",
      "NOT_PENDING",
      "NO_EMAIL",
      "REMINDER_LIMIT",
      "UNSUBSCRIBED",
    ]);
    expect(Object.keys(copy.checkIn.result)).toEqual(
      expect.arrayContaining(["OK", "DUPLICATE", "INVALID", "WRONG_EVENT"]),
    );
  });
});

describe("deadlineText", () => {
  const at = { rsvpDeadline: "2027-03-01T10:00:00.000Z", rsvpDeadlineLocal: "2027-03-01T18:00" };
  const words = copy.responses.deadline;

  it("counts the days for a celebration", () => {
    expect(deadlineText(words, { ...at, state: "OPEN", days: 12 }, false)).toBe(
      "Replies close on Monday, 1 March 2027 at 6:00 PM. 12 days to go.",
    );
    expect(deadlineText(words, { ...at, state: "OPEN", days: 1 }, false)).toContain("1 day to go.");
  });

  it("states the date only for a memorial, with no count of days", () => {
    const text = deadlineText(words, { ...at, state: "OPEN", days: 12 }, true);
    expect(text).toBe("Replies close on Monday, 1 March 2027 at 6:00 PM.");
    expect(text).not.toMatch(/days? to go/);
  });

  it("covers no date, due today and closed", () => {
    const none = {
      rsvpDeadline: null,
      rsvpDeadlineLocal: null,
      state: "NONE" as const,
      days: null,
    };
    expect(deadlineText(words, none, false)).toBe(words.NONE);
    expect(deadlineText(words, { ...at, state: "DUE_TODAY", days: 0 }, false)).toContain(
      "Replies close today",
    );
    expect(deadlineText(words, { ...at, state: "CLOSED", days: -2 }, false)).toContain(
      "Replies closed on Monday, 1 March 2027",
    );
  });
});
