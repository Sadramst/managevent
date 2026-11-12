import { describe, expect, it } from "vitest";
import { generateId } from "@managevent/db";
import {
  GuestRsvpSubmitSchema,
  hasHealthInformation,
  type RsvpConfig,
  RsvpConfigSchema,
} from "@managevent/validators";
import { minimiseRsvpSubmission } from "./minimise.js";

const guestA = generateId("gst_");
const guestB = generateId("gst_");

const everything = (overrides: Partial<RsvpConfig> = {}): RsvpConfig =>
  RsvpConfigSchema.parse({
    askDietary: true,
    askAccessibility: true,
    songPrompt: "STANDARD",
    askMessage: true,
    askContact: true,
    ...overrides,
  });

const fullHealth = {
  dietary: ["VEGAN", "NUT_ALLERGY"],
  allergyNotes: "Carries an adrenaline pen",
  allergySeverity: "SEVERE_ANAPHYLAXIS",
  accessibilityNotes: "Step-free access please",
};

const submission = () =>
  GuestRsvpSubmitSchema.parse({
    members: [
      { guestId: guestA, status: "YES", health: fullHealth },
      { guestId: guestB, status: "YES" },
    ],
    plusOnes: [{ name: "Pat Plusone", health: { dietary: ["HALAL"] } }],
    songRequests: ["September"],
    messageToHost: "See you there",
    contact: { email: "guest@example.org", consentGranted: true },
    healthConsent: {
      granted: true,
      textShown: "I agree that my dietary details are shared with the hosts and their caterer.",
    },
  });

describe("minimiseRsvpSubmission", () => {
  it("keeps everything the host asked for, unchanged", () => {
    const body = submission();
    expect(minimiseRsvpSubmission(body, everything())).toEqual(body);
  });

  it("does not mutate the submission it is given", () => {
    const body = submission();
    const copy = structuredClone(body);
    minimiseRsvpSubmission(body, everything({ askDietary: false, askContact: false }));
    expect(body).toEqual(copy);
  });

  it("drops health for a guest who is not coming, whatever was sent", () => {
    const body = GuestRsvpSubmitSchema.parse({
      members: [
        { guestId: guestA, status: "NO", health: fullHealth },
        { guestId: guestB, status: "NO" },
      ],
      healthConsent: submission().healthConsent,
    });
    const result = minimiseRsvpSubmission(body, everything());
    expect(result.members).toEqual([
      { guestId: guestA, status: "NO" },
      { guestId: guestB, status: "NO" },
    ]);
    expect(result.members.some((member) => hasHealthInformation(member.health))).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/VEGAN|adrenaline|Step-free/);
  });

  it("keeps health for a MAYBE: the caterer may still need it", () => {
    const body = GuestRsvpSubmitSchema.parse({
      members: [{ guestId: guestA, status: "MAYBE", health: fullHealth }],
      healthConsent: submission().healthConsent,
    });
    expect(minimiseRsvpSubmission(body, everything()).members[0]?.health).toEqual(fullHealth);
  });

  it("drops dietary and allergy details when the host does not ask about food", () => {
    const result = minimiseRsvpSubmission(submission(), everything({ askDietary: false }));
    expect(result.members[0]?.health).toEqual({
      dietary: [],
      accessibilityNotes: "Step-free access please",
    });
    expect(result.plusOnes[0]?.health).toEqual({ dietary: [] });
    // A guest who sent no health block still has none ("keep what is on file").
    expect(result.members[1]).toEqual({ guestId: guestB, status: "YES" });
  });

  it("drops accessibility notes when the host does not ask about access", () => {
    const result = minimiseRsvpSubmission(submission(), everything({ askAccessibility: false }));
    expect(result.members[0]?.health).toEqual({
      dietary: ["VEGAN", "NUT_ALLERGY"],
      allergyNotes: "Carries an adrenaline pen",
      allergySeverity: "SEVERE_ANAPHYLAXIS",
    });
  });

  it("writes no health block at all when neither question is asked", () => {
    const result = minimiseRsvpSubmission(
      submission(),
      everything({ askDietary: false, askAccessibility: false }),
    );
    expect(result.members.every((member) => member.health === undefined)).toBe(true);
    expect(result.plusOnes.every((plusOne) => plusOne.health === undefined)).toBe(true);
  });

  it("drops song requests when the prompt is hidden, and keeps them for either visible prompt", () => {
    expect(
      minimiseRsvpSubmission(submission(), everything({ songPrompt: "HIDDEN" })).songRequests,
    ).toEqual([]);
    expect(
      minimiseRsvpSubmission(submission(), everything({ songPrompt: "MEMORIAL" })).songRequests,
    ).toEqual(["September"]);
  });

  it("drops the message and the contact details when they were not asked for", () => {
    const result = minimiseRsvpSubmission(
      submission(),
      everything({ askMessage: false, askContact: false }),
    );
    expect(result).not.toHaveProperty("messageToHost");
    expect(result).not.toHaveProperty("contact");
    expect(JSON.stringify(result)).not.toContain("guest@example.org");
    // Attendance itself is never touched.
    expect(result.members.map((member) => member.status)).toEqual(["YES", "YES"]);
    expect(result.plusOnes.map((plusOne) => plusOne.name)).toEqual(["Pat Plusone"]);
  });

  it("with the default settings a guest's contact details are not collected", () => {
    const result = minimiseRsvpSubmission(submission(), RsvpConfigSchema.parse({}));
    expect(result).not.toHaveProperty("contact");
    expect(result.messageToHost).toBe("See you there");
    expect(result.members[0]?.health).toEqual(fullHealth);
  });
});
