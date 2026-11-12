import { invitationStudioEn } from "@managevent/i18n";
import {
  HostEventUpdateSchema,
  type InvitationContent,
  InvitationContentSchema,
} from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  checkHttpsUrl,
  CONTENT_LIMITS,
  type ContentForm,
  type EventForm,
  eventUpdateFrom,
  fromContentForm,
  moveItem,
  newRowId,
  toContentForm,
  validateContentForm,
  validateEventForm,
} from "./content-form";

const copy = invitationStudioEn.content.errors;

const stored: InvitationContent = InvitationContentSchema.parse({
  version: 1,
  headline: "Sarah and Daniel",
  subheadline: "Together with their families",
  hosts: "Sarah Chen and Daniel Morris",
  wording: "We would love you to join us\nas we celebrate.",
  story: ["We met in Fremantle.", "Ten years on, here we are."],
  schedule: [
    { id: "s001", time: "16:30", title: "Ceremony", location: "The lawn" },
    { id: "s002", time: "18:00", title: "Dinner", description: "Three courses" },
  ],
  venue: {
    name: "Kings Park",
    address: "Fraser Avenue, Perth WA",
    mapsUrl: "https://maps.example.org/kings-park",
    parking: "Free parking on Fraser Avenue.",
  },
  dressCode: "Cocktail",
  faq: [{ question: "Is there parking?", answer: "Yes." }],
  coverImageUrl: "https://images.example.org/cover.jpg",
  galleryImageUrls: ["https://images.example.org/one.jpg"],
  music: {
    enabled: true,
    url: "https://audio.example.org/track.mp3",
    title: "Our song",
    rightsAttested: true,
  },
});

describe("content form", () => {
  it("round-trips stored content unchanged, music included", () => {
    const form = toContentForm(stored);
    expect(validateContentForm(form, copy)).toEqual({});
    expect(fromContentForm(form, stored)).toEqual(stored);
  });

  it("round-trips the minimal content a new event starts with", () => {
    const minimal = InvitationContentSchema.parse({
      version: 1,
      headline: "Mia turns 30",
      hosts: "Mia Tran",
      venue: null,
      coverImageUrl: null,
      music: { enabled: false, url: null, title: null, rightsAttested: false },
    });
    const form = toContentForm(minimal);
    expect(validateContentForm(form, copy)).toEqual({});
    expect(fromContentForm(form, minimal)).toEqual(minimal);
  });

  it("trims text, drops blank optional values and keeps the venue only with a name", () => {
    const form: ContentForm = {
      ...toContentForm(stored),
      headline: "  Sarah and Daniel  ",
      subheadline: "   ",
      dressCode: " ",
      venueMapsUrl: "",
      venueParking: "  ",
      coverImageUrl: "",
    };
    const saved = InvitationContentSchema.parse(fromContentForm(form, stored));
    expect(saved.headline).toBe("Sarah and Daniel");
    expect(saved.subheadline).toBe("");
    expect(saved.dressCode).toBeUndefined();
    expect(saved.venue).toEqual({ name: "Kings Park", address: "Fraser Avenue, Perth WA" });
    expect(saved.coverImageUrl).toBeNull();

    const noVenue = fromContentForm(
      { ...form, venueName: "", venueAddress: "", venueMapsUrl: "", venueParking: "" },
      stored,
    );
    expect(noVenue.venue).toBeNull();
  });

  it("puts each problem on its own field", () => {
    const base = toContentForm(stored);
    const form: ContentForm = {
      ...base,
      headline: " ",
      hosts: "",
      wording: "x".repeat(CONTENT_LIMITS.wording + 1),
      story: [{ key: "st1", value: "  " }],
      schedule: [{ id: "s009", time: "", title: "", description: "", location: "" }],
      venueName: "",
      venueMapsUrl: "http://maps.example.org",
      faq: [{ key: "f1", question: "", answer: "" }],
      coverImageUrl: "not a link",
      gallery: [
        { key: "g1", value: "" },
        { key: "g2", value: `https://example.org/${"a".repeat(500)}` },
      ],
    };
    expect(validateContentForm(form, copy)).toEqual({
      headline: copy.required,
      hosts: copy.required,
      wording: copy.tooLong.replace("{max}", String(CONTENT_LIMITS.wording)),
      "story.st1": copy.storyEmpty,
      "schedule.s009.time": copy.scheduleTime,
      "schedule.s009.title": copy.scheduleTitle,
      venueName: copy.venueNameRequired,
      venueMapsUrl: copy.url,
      "faq.f1.question": copy.faqQuestion,
      "faq.f1.answer": copy.faqAnswer,
      coverImageUrl: copy.url,
      "gallery.g1": copy.url,
      "gallery.g2": copy.urlTooLong,
    });
  });

  it("only passes forms whose saved content the contract accepts", () => {
    const base = toContentForm(stored);
    const candidates: ContentForm[] = [
      base,
      { ...base, headline: "x".repeat(160), hosts: "y".repeat(160) },
      { ...base, headline: "x".repeat(161) },
      {
        ...base,
        story: Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, value: "z".repeat(1200) })),
      },
      {
        ...base,
        schedule: [
          { id: newRowId("s"), time: "09:05", title: "Tea", description: "", location: "" },
        ],
      },
      {
        ...base,
        schedule: [{ id: "s010", time: "25:00", title: "Tea", description: "", location: "" }],
      },
      { ...base, venueMapsUrl: "https://" },
      { ...base, venueMapsUrl: "ftp://maps.example.org" },
      { ...base, coverImageUrl: " https://images.example.org/a.jpg " },
      { ...base, faq: [{ key: "f", question: "q".repeat(201), answer: "a" }] },
      { ...base, venueParking: "p".repeat(501) },
    ];
    let accepted = 0;
    for (const form of candidates) {
      if (Object.keys(validateContentForm(form, copy)).length > 0) continue;
      accepted += 1;
      const result = InvitationContentSchema.safeParse(fromContentForm(form, stored));
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
    expect(accepted).toBe(5);
  });

  it("checks links the way the contract does", () => {
    expect(checkHttpsUrl("https://example.org/a.jpg")).toBe("ok");
    expect(checkHttpsUrl("http://example.org/a.jpg")).toBe("invalid");
    expect(checkHttpsUrl("https://")).toBe("invalid");
    expect(checkHttpsUrl("example.org")).toBe("invalid");
    expect(checkHttpsUrl(`https://example.org/${"a".repeat(500)}`)).toBe("too-long");
  });

  it("makes row ids that fit a schedule item id", () => {
    const id = newRowId("s");
    expect(id.length).toBeGreaterThanOrEqual(4);
    expect(id.length).toBeLessThanOrEqual(24);
    expect(newRowId("s")).not.toBe(id);
  });

  it("moves list items without losing any", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});

describe("event form", () => {
  const baseline: EventForm = {
    title: "Sarah and Daniel",
    date: "2027-03-20",
    startTime: "16:30",
    endTime: "23:00",
    timeZone: "Australia/Perth",
  };

  it("sends nothing when nothing changed", () => {
    expect(eventUpdateFrom({ ...baseline }, baseline)).toBeNull();
  });

  it("sends only what changed, in a shape the contract accepts", () => {
    const renamed = eventUpdateFrom({ ...baseline, title: "The big day " }, baseline);
    expect(renamed).toEqual({ title: "The big day" });

    const moved = eventUpdateFrom({ ...baseline, date: "2027-03-21", endTime: "00:30" }, baseline);
    expect(moved).toEqual({
      startsAtLocal: "2027-03-21T16:30",
      endsAtLocal: "2027-03-22T00:30",
    });
    expect(HostEventUpdateSchema.safeParse(moved).success).toBe(true);

    const noEnd = eventUpdateFrom({ ...baseline, endTime: "" }, baseline);
    expect(noEnd).toEqual({ endsAtLocal: null });
    expect(HostEventUpdateSchema.safeParse(noEnd).success).toBe(true);

    expect(eventUpdateFrom({ ...baseline, timeZone: "Australia/Sydney" }, baseline)).toEqual({
      timeZone: "Australia/Sydney",
    });
  });

  it("needs a name, a real date and a start time", () => {
    expect(validateEventForm(baseline, copy)).toEqual({});
    expect(
      validateEventForm(
        { ...baseline, title: "", date: "2027-02-30", startTime: "", endTime: "" },
        copy,
      ),
    ).toEqual({
      "event.title": copy.required,
      "event.date": copy.dateRequired,
      "event.startTime": copy.timeRequired,
    });
    expect(validateEventForm({ ...baseline, endTime: "16:30" }, copy)).toEqual({
      "event.endTime": copy.endBeforeStart,
    });
  });
});
