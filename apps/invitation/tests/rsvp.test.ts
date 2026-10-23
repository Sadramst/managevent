import { describe, it, expect, beforeEach } from "vitest";
import { invitationStore } from "../lib/invitation-store";
import type { RsvpSubmissionPayload } from "../lib/types";

describe("RSVP Submission & Idempotency", () => {
  const eventSlug = "anniversary";
  const guestToken = "armita-party-g9qtmt";

  it("verifies and finds party by token", () => {
    const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);
    expect(lookup).not.toBeNull();
    expect(lookup?.party.displayName).toBe("Armita & Hesam");
    expect(lookup?.event.slug).toBe(eventSlug);
  });

  it("returns null for unknown tokens", () => {
    const lookup = invitationStore.findGuestPartyByToken(eventSlug, "unknown-token-999");
    expect(lookup).toBeNull();
  });

  it("records RSVP acceptance with dietary requirements and notes", () => {
    const payload: RsvpSubmissionPayload = {
      eventSlug,
      guestToken,
      status: "YES",
      guests: [
        {
          id: "gst_armita",
          name: "Armita",
          status: "YES",
          dietary: ["VEGAN", "GLUTEN_FREE"],
          healthDataConsentGranted: true,
        },
        {
          id: "gst_hesam",
          name: "Hesam",
          status: "YES",
          dietary: ["HALAL"],
          healthDataConsentGranted: true,
        },
      ],
      songRequests: ["Hayedeh — Gol-e Sangam"],
      messageToHost: "Wishing you both endless happiness!",
      locale: "en",
    };

    const updated = invitationStore.submitRsvp(payload);
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("YES");
    expect(updated?.members[0]!.dietary).toContain("VEGAN");
    expect(updated?.notes).toBe("Wishing you both endless happiness!");

    // Verify responses summary reflects the counts
    const summary = invitationStore.getEventResponsesSummary(lookupEventId());
    expect(summary).not.toBeNull();
    expect(summary?.confirmedAdults).toBeGreaterThanOrEqual(2);
    expect(summary?.dietaryBreakdown["VEGAN"]).toBeGreaterThanOrEqual(1);
    expect(summary?.dietaryBreakdown["HALAL"]).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent: repeated submission updates without duplicating party members", () => {
    const initialSummary = invitationStore.getEventResponsesSummary(lookupEventId());
    const initialPartiesCount = initialSummary?.totalParties;

    const payload: RsvpSubmissionPayload = {
      eventSlug,
      guestToken,
      status: "YES",
      guests: [
        {
          id: "gst_armita",
          name: "Armita",
          status: "YES",
          dietary: ["NONE"],
          healthDataConsentGranted: true,
        },
      ],
      messageToHost: "Updated message",
      locale: "en",
    };

    invitationStore.submitRsvp(payload);
    invitationStore.submitRsvp(payload);

    const postSummary = invitationStore.getEventResponsesSummary(lookupEventId());
    expect(postSummary?.totalParties).toBe(initialPartiesCount);
  });

  function lookupEventId(): string {
    const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);
    return lookup!.event.id;
  }
});
