import { describe, expect, it } from "vitest";
import { legacyPathCandidates } from "./service.js";
import {
  computeRsvpState,
  eventPhase,
  isRsvpClosed,
  readInvitationContent,
  readPresentation,
  readRsvpConfig,
  toWellView,
} from "./view.js";

const HOUR = 60 * 60 * 1000;

describe("guest-site/view (pure)", () => {
  const startsAt = new Date("2027-03-06T08:00:00.000Z");

  it("closes RSVPs after the deadline or once the event has started", () => {
    const deadline = new Date("2027-02-20T16:00:00.000Z");
    const at = (iso: string, rsvpDeadline: Date | null = deadline) =>
      isRsvpClosed({ rsvpDeadline, startsAt, now: new Date(iso) });

    expect(at("2027-02-20T15:59:59.000Z")).toBe(false);
    // The deadline instant itself is still open; one millisecond later is not.
    expect(at("2027-02-20T16:00:00.000Z")).toBe(false);
    expect(at("2027-02-20T16:00:00.001Z")).toBe(true);
    // No deadline: open until the event starts.
    expect(at("2027-03-06T07:59:59.999Z", null)).toBe(false);
    expect(at("2027-03-06T08:00:00.000Z", null)).toBe(true);
  });

  it("reports READ_ONLY for demos and previews before anything else", () => {
    const base = { rsvpDeadline: null, startsAt, now: new Date("2027-01-01T00:00:00.000Z") };
    expect(computeRsvpState({ ...base, demo: false, preview: false })).toBe("OPEN");
    expect(computeRsvpState({ ...base, demo: true, preview: false })).toBe("READ_ONLY");
    expect(computeRsvpState({ ...base, demo: false, preview: true })).toBe("READ_ONLY");
    const late = { ...base, now: new Date("2027-04-01T00:00:00.000Z") };
    expect(computeRsvpState({ ...late, demo: false, preview: false })).toBe("CLOSED");
    expect(computeRsvpState({ ...late, demo: true, preview: false })).toBe("READ_ONLY");
  });

  it("treats an event as past once it has ended (five hours after the start by default)", () => {
    const noEnd = { startsAt, endsAt: null };
    expect(eventPhase(noEnd, new Date(startsAt.getTime() + 5 * HOUR - 1))).toBe("UPCOMING");
    expect(eventPhase(noEnd, new Date(startsAt.getTime() + 5 * HOUR))).toBe("PAST");
    const withEnd = { startsAt, endsAt: new Date(startsAt.getTime() + 2 * HOUR) };
    expect(eventPhase(withEnd, new Date(startsAt.getTime() + 2 * HOUR - 1))).toBe("UPCOMING");
    expect(eventPhase(withEnd, new Date(startsAt.getTime() + 2 * HOUR))).toBe("PAST");
  });

  it("never shows a wishing well's bank details on a memorial invitation", () => {
    const wellConfigJson = {
      message: "Your presence is enough.",
      payId: "pay@example.com",
      bsb: "066-000",
      accountNumber: "12345678",
      accountName: "S and A",
      registryUrl: "https://registry.example/list",
      donationUrl: "https://charity.example/give",
      tributePrompt: "Share a memory",
    };
    expect(toWellView({ wellMode: "NONE", wellConfigJson }, "CELEBRATION")).toBeNull();

    const celebration = toWellView({ wellMode: "WISHING_WELL", wellConfigJson }, "CELEBRATION");
    expect(celebration).toEqual({ mode: "WISHING_WELL", ...wellConfigJson });

    const memorial = toWellView({ wellMode: "TRIBUTE_BOOK", wellConfigJson }, "MEMORIAL");
    expect(memorial).toEqual({
      mode: "TRIBUTE_BOOK",
      message: "Your presence is enough.",
      donationUrl: "https://charity.example/give",
      tributePrompt: "Share a memory",
    });
  });

  it("falls back to an empty well and default RSVP settings when stored JSON is malformed", () => {
    expect(toWellView({ wellMode: "WISHING_WELL", wellConfigJson: "nope" }, "CELEBRATION")).toEqual(
      { mode: "WISHING_WELL" },
    );
    expect(readRsvpConfig(null, "CELEBRATION")).toEqual({
      allowMaybe: false,
      askDietary: true,
      askAccessibility: true,
      songPrompt: "STANDARD",
      askMessage: true,
      askContact: false,
    });
    // Memorial Mode: the celebratory song prompt is never shown.
    expect(readRsvpConfig({ songPrompt: "STANDARD" }, "MEMORIAL").songPrompt).toBe("HIDDEN");
    expect(readRsvpConfig({ songPrompt: "MEMORIAL" }, "MEMORIAL").songPrompt).toBe("MEMORIAL");
    expect(readRsvpConfig({ allowMaybe: true }, "CELEBRATION").allowMaybe).toBe(true);
  });

  it("serves a minimal invitation when stored content does not validate", () => {
    const content = readInvitationContent({ version: 99 }, "Sara and Ali");
    expect(content).toMatchObject({
      version: 1,
      headline: "Sara and Ali",
      hosts: "Sara and Ali",
      venue: null,
      music: { enabled: false },
    });
    expect(readInvitationContent(null, "  ").headline).toBe("Invitation");
  });

  it("keeps catalogue values and falls back to template defaults for anything else", () => {
    expect(
      readPresentation(
        { templateSlug: "botanic-garden", themeId: "midnight-celestial", gateStyle: "ribbon" },
        "CELEBRATION",
      ),
    ).toEqual({
      templateSlug: "botanic-garden",
      themeId: "midnight-celestial",
      gateStyle: "ribbon",
    });
    expect(
      readPresentation(
        { templateSlug: "retired-template", themeId: "neon", gateStyle: "envelope" },
        "CELEBRATION",
      ),
    ).toEqual({ templateSlug: "royal-classic", themeId: "royal-ivory", gateStyle: "wax-seal" });
    expect(
      readPresentation(
        { templateSlug: "botanic-garden", themeId: "neon", gateStyle: "envelope" },
        "CELEBRATION",
      ),
    ).toEqual({ templateSlug: "botanic-garden", themeId: "emerald-botanic", gateStyle: "arch" });
  });

  it("renders a memorial invitation in Memorial Mode whatever the stored style says", () => {
    expect(
      readPresentation(
        { templateSlug: "memorial-linen", themeId: "memorial-slate", gateStyle: "plain-fade" },
        "MEMORIAL",
      ),
    ).toEqual({
      templateSlug: "memorial-linen",
      themeId: "memorial-slate",
      gateStyle: "plain-fade",
    });
    // A celebration template, theme and animated gate on a memorial event are never served.
    expect(
      readPresentation(
        { templateSlug: "royal-classic", themeId: "midnight-celestial", gateStyle: "wax-seal" },
        "MEMORIAL",
      ),
    ).toEqual({
      templateSlug: "memorial-calm",
      themeId: "memorial-alabaster",
      gateStyle: "plain-fade",
    });
  });

  it("derives legacy path candidates and refuses traversal or control characters", () => {
    expect(legacyPathCandidates("/anniversary/Armita-Party-g9qtmt")).toEqual([
      "/anniversary/Armita-Party-g9qtmt",
      "/anniversary/armita-party-g9qtmt",
    ]);
    expect(legacyPathCandidates("anniversary/armita-party-g9qtmt/?utm=x#top")).toEqual([
      "/anniversary/armita-party-g9qtmt",
    ]);
    expect(legacyPathCandidates("/legacy/e/sara-ali/sara-family")).toEqual([
      "/legacy/e/sara-ali/sara-family",
      "/e/sara-ali/sara-family",
    ]);
    expect(legacyPathCandidates("/anniversary/../secret")).toEqual([]);
    expect(legacyPathCandidates("/anniversary/a\nb")).toEqual([]);
    expect(legacyPathCandidates("   ")).toEqual([]);
    expect(legacyPathCandidates("/")).toEqual([]);
  });
});
