import { afterEach, describe, expect, it, vi } from "vitest";
import {
  guestCalendarPath,
  guestOpenedPath,
  guestPassPath,
  guestPath,
  parseGuestPath,
  sameLocalDay,
  timeZoneCity,
  venueMapsUrl,
} from "./guest/paths";
import { NOINDEX, privateMetadata } from "./metadata";
import {
  absoluteInviteUrl,
  absoluteUrl,
  invitationUrl,
  marketingUrl,
  routes,
  wwwLinks,
  wwwUrl,
} from "./urls";

/** Loads `./urls` again with the given public origins, as a fresh build would see them. */
async function urlsWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("./urls");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site origins", () => {
  it("never end in a slash, whatever the environment gives", async () => {
    const urls = await urlsWith({
      NEXT_PUBLIC_INVITATION_URL: "https://invitation.example.test///",
      NEXT_PUBLIC_MARKETING_URL: " https://www.example.test/ ",
    });
    expect(urls.invitationUrl).toBe("https://invitation.example.test");
    expect(urls.marketingUrl).toBe("https://www.example.test");
    expect(urls.absoluteUrl("/templates")).toBe("https://invitation.example.test/templates");
    expect(urls.wwwLinks.contact).toBe("https://www.example.test/contact");
  });

  it("fall back to the local ports outside production", async () => {
    const urls = await urlsWith({
      NODE_ENV: "test",
      NEXT_PUBLIC_INVITATION_URL: undefined,
      NEXT_PUBLIC_MARKETING_URL: undefined,
    });
    expect(urls.invitationUrl).toBe("http://localhost:3001");
    expect(urls.marketingUrl).toBe("http://localhost:3100");
  });

  it("fall back to the real domains in production", async () => {
    const urls = await urlsWith({
      NODE_ENV: "production",
      NEXT_PUBLIC_INVITATION_URL: undefined,
      NEXT_PUBLIC_MARKETING_URL: undefined,
    });
    expect(urls.invitationUrl).toBe("https://invitation.managevent.com.au");
    expect(urls.marketingUrl).toBe("https://www.managevent.com.au");
  });
});

describe("absolute URLs", () => {
  it("joins a path to this site, with or without a leading slash", () => {
    expect(absoluteUrl()).toBe(invitationUrl);
    expect(absoluteUrl("/")).toBe(invitationUrl);
    expect(absoluteUrl("/pricing")).toBe(`${invitationUrl}/pricing`);
    expect(absoluteUrl("pricing")).toBe(`${invitationUrl}/pricing`);
  });

  it("joins a path to www", () => {
    expect(wwwUrl()).toBe(marketingUrl);
    expect(wwwUrl("/contact")).toBe(`${marketingUrl}/contact`);
    expect(wwwLinks.home).toBe(marketingUrl);
    expect(wwwLinks.privacy).toBe(`${marketingUrl}/privacy`);
    expect(wwwLinks.terms).toBe(`${marketingUrl}/terms`);
    expect(wwwLinks.accessibility).toBe(`${marketingUrl}/accessibility`);
    expect(wwwLinks.invitations).toBe(`${marketingUrl}/invitations`);
  });
});

describe("absoluteInviteUrl", () => {
  it("makes a party's invite path absolute on this site", () => {
    expect(absoluteInviteUrl("/i/maya-and-daniel-x7k2/the-nguyen-family-2b3c4d5f")).toBe(
      `${invitationUrl}/i/maya-and-daniel-x7k2/the-nguyen-family-2b3c4d5f`,
    );
  });

  it("is null when there is no link to share (a read-only co-host)", () => {
    expect(absoluteInviteUrl(null)).toBeNull();
    expect(absoluteInviteUrl(undefined)).toBeNull();
    expect(absoluteInviteUrl("")).toBeNull();
  });

  it("refuses anything that is not a guest path, so a bad value cannot become a link", () => {
    expect(absoluteInviteUrl("https://evil.example/i/a/b")).toBeNull();
    expect(absoluteInviteUrl("//evil.example/i/a/b")).toBeNull();
    expect(absoluteInviteUrl("/studio/evt_1")).toBeNull();
    expect(absoluteInviteUrl("i/a/b")).toBeNull();
  });
});

describe("routes", () => {
  it("names every fixed page", () => {
    expect(routes).toMatchObject({
      home: "/",
      templates: "/templates",
      pricing: "/pricing",
      signIn: "/sign-in",
      signUp: "/sign-up",
      twoFactor: "/sign-in/two-factor",
      resetPassword: "/reset-password",
      unsubscribe: "/unsubscribe",
      studio: "/studio",
      studioNew: "/studio/new",
    });
  });

  it("builds the pages of one event", () => {
    expect(routes.event("evt_01ABC")).toBe("/studio/evt_01ABC");
    expect(routes.eventTab("evt_01ABC", "guests")).toBe("/studio/evt_01ABC/guests");
    expect(routes.eventTab("evt_01ABC", "awaiting")).toBe("/studio/evt_01ABC/awaiting");
    expect(routes.responsesCsv("evt_01ABC")).toBe("/studio/evt_01ABC/responses/export.csv");
    expect(routes.checkIn("evt_01ABC")).toBe("/check-in/evt_01ABC");
  });

  it("encodes an id, so it cannot add path segments or a query", () => {
    expect(routes.event("a/b?c=d")).toBe("/studio/a%2Fb%3Fc%3Dd");
    expect(routes.eventTab("../new", "settings")).toBe("/studio/..%2Fnew/settings");
    expect(routes.checkIn("x#y")).toBe("/check-in/x%23y");
  });
});

describe("guest paths", () => {
  const link = { eventSlug: "maya-and-daniel-x7k2", guestToken: "the-nguyen-family-2b3c4d5f" };

  it("builds the invitation, its opened form, the pass page and the calendar file", () => {
    expect(guestPath(link)).toBe("/i/maya-and-daniel-x7k2/the-nguyen-family-2b3c4d5f");
    expect(guestOpenedPath(link)).toBe(`${guestPath(link)}?opened=1`);
    expect(guestOpenedPath(link, "rsvp")).toBe(`${guestPath(link)}?opened=1#rsvp`);
    expect(guestPassPath(link)).toBe(`${guestPath(link)}/pass`);
    expect(guestCalendarPath(link)).toBe(`${guestPath(link)}/calendar.ics`);
  });

  it("encodes both parts", () => {
    expect(guestPath({ eventSlug: "a/b", guestToken: "c d" })).toBe("/i/a%2Fb/c%20d");
  });

  it("reads the two parts back from a request path, with or without a sub-page", () => {
    expect(parseGuestPath(guestPath(link))).toEqual(link);
    expect(parseGuestPath(guestPassPath(link))).toEqual(link);
    expect(parseGuestPath(guestCalendarPath(link))).toEqual(link);
    expect(parseGuestPath("/i/a%2Fb/c%20d")).toEqual({ eventSlug: "a/b", guestToken: "c d" });
  });

  it("is null for anything that is not a guest link", () => {
    expect(parseGuestPath("/")).toBeNull();
    expect(parseGuestPath("/i")).toBeNull();
    expect(parseGuestPath("/i/only-a-slug")).toBeNull();
    expect(parseGuestPath("/i//token")).toBeNull();
    expect(parseGuestPath("/studio/evt_1/guests")).toBeNull();
    expect(parseGuestPath("/i/bad%E0%A4%A/token")).toBeNull();
  });
});

describe("venue and time zone helpers", () => {
  it("uses the host's own map link when there is one", () => {
    expect(
      venueMapsUrl({ name: "Kings Park", address: "", mapsUrl: "https://maps.example/x" }),
    ).toBe("https://maps.example/x");
  });

  it("otherwise searches for the venue name and address", () => {
    expect(venueMapsUrl({ name: "Fraser's", address: "Fraser Avenue, Kings Park WA 6005" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Fraser's%2C%20Fraser%20Avenue%2C%20Kings%20Park%20WA%206005",
    );
    expect(venueMapsUrl({ name: "Kings Park", address: "  " })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Kings%20Park",
    );
  });

  it("names the city of a time zone", () => {
    expect(timeZoneCity("Australia/Perth")).toBe("Perth");
    expect(timeZoneCity("Asia/Ho_Chi_Minh")).toBe("Ho Chi Minh");
    expect(timeZoneCity("UTC")).toBe("UTC");
  });

  it("compares local date-times by calendar day", () => {
    expect(sameLocalDay("2026-10-23T16:30", "2026-10-23T23:59")).toBe(true);
    expect(sameLocalDay("2026-10-23T23:59", "2026-10-24T00:00")).toBe(false);
  });
});

describe("privateMetadata", () => {
  it("always carries noindex, nofollow and noarchive", () => {
    expect(NOINDEX).toMatchObject({ index: false, follow: false, noarchive: true });
    expect(privateMetadata("Guests")).toEqual({ title: "Guests", robots: NOINDEX });
    expect(privateMetadata("Guests", "Your guest list")).toEqual({
      title: "Guests",
      description: "Your guest list",
      robots: NOINDEX,
    });
  });
});
