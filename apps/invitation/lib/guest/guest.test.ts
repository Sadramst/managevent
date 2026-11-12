import { getInvitationGuest, guestVoice } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { celebrationTokens, getContrastRatio } from "@managevent/ui/tokens";
import { GuestHealthConsentSchema, InvitationThemeIdEnum } from "@managevent/validators";
import { describe, expect, it } from "vitest";
import { buildGuestStatusHtml, GUEST_STATUS_HEADERS } from "./gone-page";
import {
  guestCalendarPath,
  guestOpenedPath,
  guestPassPath,
  guestPath,
  parseGuestPath,
  timeZoneCity,
  venueMapsUrl,
} from "./paths";
import { ensureContrast, getGuestTheme, mixHex } from "./theme";

const link = { eventSlug: "sample-royal-classic-smp2", guestToken: "sample-guest-family-ca7zfc6d" };

describe("guest paths", () => {
  it("builds the invitation, pass and calendar paths from a link", () => {
    expect(guestPath(link)).toBe("/i/sample-royal-classic-smp2/sample-guest-family-ca7zfc6d");
    expect(guestOpenedPath(link, "rsvp")).toBe(`${guestPath(link)}?opened=1#rsvp`);
    expect(guestPassPath(link)).toBe(`${guestPath(link)}/pass`);
    expect(guestCalendarPath(link)).toBe(`${guestPath(link)}/calendar.ics`);
  });

  it("reads the slug and token back from any guest path, and nothing else", () => {
    expect(parseGuestPath(guestPath(link))).toEqual(link);
    expect(parseGuestPath(`${guestPath(link)}/pass`)).toEqual(link);
    expect(parseGuestPath(`${guestPath(link)}/calendar.ics`)).toEqual(link);
    expect(parseGuestPath("/i/only-a-slug")).toBeNull();
    expect(parseGuestPath("/studio/evt_1")).toBeNull();
    expect(parseGuestPath("/i/%E0%A4%A/token")).toBeNull();
  });

  it("uses the host's maps link, or searches for the venue", () => {
    expect(
      venueMapsUrl({
        name: "Larkspur House",
        address: "48 Marri Blossom Lane, Upper Swan WA 6069",
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=Larkspur%20House%2C%2048%20Marri%20Blossom%20Lane%2C%20Upper%20Swan%20WA%206069",
    );
    expect(
      venueMapsUrl({ name: "A", address: "B", mapsUrl: "https://maps.example.org/place" }),
    ).toBe("https://maps.example.org/place");
  });

  it("names the time zone by its city", () => {
    expect(timeZoneCity("Australia/Perth")).toBe("Perth");
    expect(timeZoneCity("Asia/Ho_Chi_Minh")).toBe("Ho Chi Minh");
  });
});

describe("guest themes", () => {
  const themeIds = InvitationThemeIdEnum.options;

  it("gives every theme readable text, buttons and status colours (WCAG AA)", () => {
    for (const themeId of themeIds) {
      const mode = INVITATION_THEMES[themeId].mode === "memorial" ? "MEMORIAL" : "CELEBRATION";
      const { style } = getGuestTheme(themeId, mode);
      const read = (name: string) => style[name] ?? "";
      const surfaces = [read("--me-surface"), read("--me-surface-raised"), read("--inv-bg-warm")];
      for (const surface of surfaces) {
        for (const token of [
          "--me-ink",
          "--me-ink-muted",
          "--me-primary",
          "--me-accent-strong",
          "--me-danger",
          "--me-success",
          "--me-warning",
        ]) {
          expect(
            getContrastRatio(read(token), surface),
            `${themeId} ${token} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        getContrastRatio(read("--me-on-primary"), read("--me-primary")),
        `${themeId} button text`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        getContrastRatio(read("--inv-on-seal"), read("--inv-seal")),
        `${themeId} seal glyph`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("marks only the dark theme as dark and keeps each theme's own background", () => {
    expect(getGuestTheme("midnight-celestial", "CELEBRATION").tone).toBe("dark");
    expect(getGuestTheme("royal-ivory", "CELEBRATION").tone).toBe("light");
    for (const themeId of themeIds) {
      const mode = INVITATION_THEMES[themeId].mode === "memorial" ? "MEMORIAL" : "CELEBRATION";
      expect(getGuestTheme(themeId, mode).themeColor).toBe(INVITATION_THEMES[themeId].colors.bg);
    }
  });

  it("never renders a memorial event in a celebration theme", () => {
    expect(getGuestTheme("royal-ivory", "MEMORIAL").id).toBe("memorial-alabaster");
    expect(getGuestTheme("memorial-slate", "CELEBRATION").id).toBe("royal-ivory");
  });

  it("writes the tokens as a :root rule for the page behind the wrapper", () => {
    const theme = getGuestTheme("emerald-botanic", "CELEBRATION");
    expect(theme.rootCss.startsWith(":root{")).toBe(true);
    expect(theme.rootCss).toContain(`--me-surface:${theme.style["--me-surface"]}`);
  });

  it("moves a colour only as far as contrast needs", () => {
    const { ink, surfaceRaised, accent } = celebrationTokens;
    expect(ensureContrast(ink, [surfaceRaised], ink)).toBe(ink);
    const lifted = ensureContrast(accent, [surfaceRaised], ink);
    expect(lifted).not.toBe(accent);
    expect(getContrastRatio(lifted, surfaceRaised)).toBeGreaterThanOrEqual(4.5);
    expect(mixHex(accent, ink, 0)).toBe(accent.toLowerCase());
    expect(mixHex(accent, ink, 1)).toBe(ink.toLowerCase());
  });
});

describe("the page for a link that has been turned off", () => {
  const html = buildGuestStatusHtml("gone");
  const copy = getInvitationGuest("en");

  it("is one self-contained, noindex document with nothing about the event", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(copy.gone.title);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive">');
    expect(html).not.toMatch(/<script|<link|<img|src=|href=/);
    expect(GUEST_STATUS_HEADERS["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
    expect(GUEST_STATUS_HEADERS["cache-control"]).toBe("private, no-store");
  });

  it("has a matching page for the rate limit", () => {
    const busy = buildGuestStatusHtml("busy");
    expect(busy).toContain(copy.busy.title);
    expect(busy).not.toContain(copy.gone.title);
    expect(busy).not.toMatch(/<script|<link|<img|src=|href=/);
  });
});

describe("guest copy", () => {
  const copy = getInvitationGuest("en");

  it("has consent wording the API will store (20 to 600 characters)", () => {
    expect(
      GuestHealthConsentSchema.safeParse({ granted: true, textShown: copy.rsvp.healthConsent.text })
        .success,
    ).toBe(true);
  });

  it("gives the memorial voice every key the celebration voice has", () => {
    expect(Object.keys(copy.memorial).sort()).toEqual(Object.keys(copy.celebration).sort());
    expect(guestVoice(copy, "MEMORIAL")).toBe(copy.memorial);
    expect(guestVoice(copy, "CELEBRATION")).toBe(copy.celebration);
  });

  it("keeps Memorial Mode calm: no exclamation marks and no countdown wording", () => {
    const text = JSON.stringify(copy.memorial);
    expect(text).not.toContain("!");
    expect(copy.memorial.countdownTitle).toBe("");
    expect(text.toLowerCase()).not.toMatch(/celebrat|party|dance floor|cannot wait/);
  });
});
