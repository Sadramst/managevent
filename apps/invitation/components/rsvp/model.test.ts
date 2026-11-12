import {
  type GuestPartyView,
  GuestRsvpSubmitSchema,
  type GuestRsvpView,
  type RsvpConfig,
} from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  buildSubmission,
  carriesHealth,
  failureFor,
  fieldId,
  initialDraft,
  looksLikeAuPhone,
  newIdempotencyKey,
  replyOutcome,
  type RsvpDraft,
  type RsvpMessages,
  rulesFor,
  toggleDietaryTag,
  validateDraft,
} from "./model";

const ADULT = "gst_01a1cf9c-e72f-7b05-8cfa-bed80bbc3b1c";
const CHILD = "gst_01a1cf9c-e731-784c-8962-707a7c04ea42";
const CONSENT = "I agree that these details may be shared with the hosts and the caterer.";

const messages: RsvpMessages = {
  statusRequired: "Choose an answer for {name}.",
  plusOneName: "Enter a name.",
  severityRequired: "Choose a severity.",
  emailInvalid: "Email?",
  phoneInvalid: "Phone?",
  contactConsent: "Agree to contact.",
  healthConsent: "Agree to health.",
};

function party(overrides: Partial<GuestPartyView> = {}): GuestPartyView {
  return {
    displayName: "The Nguyen family",
    maxSeats: 4,
    allowPlusOnes: true,
    childrenAllowed: true,
    tableLabel: null,
    members: [
      {
        guestId: ADULT,
        name: "Linh Nguyen",
        isChild: false,
        isPlusOne: false,
        status: "PENDING",
        respondedAt: null,
        healthOnFile: false,
      },
      {
        guestId: CHILD,
        name: "Mai Nguyen",
        isChild: true,
        isPlusOne: false,
        status: "PENDING",
        respondedAt: null,
        healthOnFile: false,
      },
    ],
    ...overrides,
  };
}

function rsvp(overrides: Partial<GuestRsvpView> = {}): GuestRsvpView {
  return {
    state: "OPEN",
    hasResponded: false,
    lastRespondedAt: null,
    seatsRemaining: 2,
    songRequests: [],
    messageToHost: null,
    ...overrides,
  };
}

function config(overrides: Partial<RsvpConfig> = {}): RsvpConfig {
  return {
    allowMaybe: false,
    askDietary: true,
    askAccessibility: true,
    songPrompt: "STANDARD",
    askMessage: true,
    askContact: false,
    ...overrides,
  };
}

function setup(
  options: {
    config?: Partial<RsvpConfig>;
    party?: Partial<GuestPartyView>;
    rsvp?: Partial<GuestRsvpView>;
  } = {},
) {
  const partyView = party(options.party);
  const rsvpView = rsvp(options.rsvp);
  const rules = rulesFor(config(options.config), partyView, rsvpView);
  return { rules, draft: initialDraft(partyView, rsvpView, rules) };
}

function answer(draft: RsvpDraft, guestId: string, status: "YES" | "NO" | "MAYBE"): RsvpDraft {
  return {
    ...draft,
    members: draft.members.map((member) =>
      member.guestId === guestId ? { ...member, status } : member,
    ),
  };
}

describe("reply form rules", () => {
  it("takes what to ask from the host's settings", () => {
    const { rules } = setup({ config: { songPrompt: "HIDDEN", askMessage: false } });
    expect(rules.askSongs).toBe(false);
    expect(rules.askMessage).toBe(false);
    expect(rules.plusOneLimit).toBe(2);
  });

  it("allows no extra guests when plus-ones are off, whatever seats remain", () => {
    const { rules } = setup({ party: { allowPlusOnes: false }, rsvp: { seatsRemaining: 3 } });
    expect(rules.plusOneLimit).toBe(0);
  });

  it("starts from earlier answers and drops a 'maybe' the host no longer allows", () => {
    const base = party();
    const withAnswers = party({
      members: [
        { ...base.members[0]!, status: "YES" },
        { ...base.members[1]!, status: "MAYBE" },
      ],
    });
    const rsvpView = rsvp({ songRequests: ["September"], messageToHost: "See you there" });
    const rules = rulesFor(config(), withAnswers, rsvpView);
    const draft = initialDraft(withAnswers, rsvpView, rules);
    expect(draft.members.map((member) => member.status)).toEqual(["YES", null]);
    expect(draft.songs).toEqual(["September"]);
    expect(draft.message).toBe("See you there");
  });
});

describe("validateDraft", () => {
  it("needs an answer for every person, in page order", () => {
    const { rules, draft } = setup();
    const errors = validateDraft(draft, rules, messages);
    expect(errors.map((error) => error.field)).toEqual([
      fieldId.memberStatus(ADULT),
      fieldId.memberStatus(CHILD),
    ]);
    expect(errors[0]?.message).toBe("Choose an answer for Linh Nguyen.");
  });

  it("requires consent as soon as health information is entered", () => {
    const { rules, draft } = setup();
    let next = answer(answer(draft, ADULT, "YES"), CHILD, "NO");
    next = {
      ...next,
      members: next.members.map((member) =>
        member.guestId === ADULT
          ? { ...member, health: toggleDietaryTag(member.health, "VEGETARIAN") }
          : member,
      ),
    };
    expect(carriesHealth(next, rules)).toBe(true);
    expect(validateDraft(next, rules, messages).map((error) => error.field)).toEqual([
      fieldId.healthConsent,
    ]);
    expect(validateDraft({ ...next, healthConsent: true }, rules, messages)).toEqual([]);
  });

  it("does not ask for consent for 'no dietary needs' or for someone who is not coming", () => {
    const { rules, draft } = setup();
    const next = answer(answer(draft, ADULT, "YES"), CHILD, "NO");
    const none = {
      ...next,
      members: next.members.map((member) => ({
        ...member,
        health: toggleDietaryTag(member.health, member.guestId === ADULT ? "NONE" : "VEGAN"),
      })),
    };
    expect(carriesHealth(none, rules)).toBe(false);
    expect(validateDraft(none, rules, messages)).toEqual([]);
  });

  it("asks how serious an allergy is", () => {
    const { rules, draft } = setup();
    let next = answer(answer(draft, ADULT, "YES"), CHILD, "NO");
    next = {
      ...next,
      healthConsent: true,
      members: next.members.map((member) =>
        member.guestId === ADULT
          ? { ...member, health: toggleDietaryTag(member.health, "NUT_ALLERGY") }
          : member,
      ),
    };
    expect(validateDraft(next, rules, messages).map((error) => error.field)).toEqual([
      fieldId.memberSeverity(ADULT),
    ]);
  });

  it("checks contact details and their consent only when the host asks for them", () => {
    const asked = setup({ config: { askContact: true } });
    const draft = {
      ...answer(answer(asked.draft, ADULT, "NO"), CHILD, "NO"),
      email: "not-an-email",
      phone: "12345",
    };
    expect(validateDraft(draft, asked.rules, messages).map((error) => error.field)).toEqual([
      fieldId.email,
      fieldId.phone,
      fieldId.contactConsent,
    ]);

    const notAsked = setup();
    const ignored = { ...answer(answer(notAsked.draft, ADULT, "NO"), CHILD, "NO"), email: "x" };
    expect(validateDraft(ignored, notAsked.rules, messages)).toEqual([]);
  });

  it("needs a name for each added guest", () => {
    const { rules, draft } = setup();
    const next = {
      ...answer(answer(draft, ADULT, "YES"), CHILD, "YES"),
      plusOnes: [
        {
          key: "plus-1",
          name: "  ",
          isChild: false,
          health: {
            dietary: [],
            allergySeverity: "" as const,
            allergyNotes: "",
            accessibilityNotes: "",
          },
        },
      ],
    };
    expect(validateDraft(next, rules, messages).map((error) => error.field)).toEqual([
      fieldId.plusOneName("plus-1"),
    ]);
  });
});

describe("buildSubmission", () => {
  it("produces a body the API contract accepts, with consent text when health is shared", () => {
    const { rules, draft } = setup();
    let next = answer(answer(draft, ADULT, "YES"), CHILD, "YES");
    next = {
      ...next,
      healthConsent: true,
      songs: ["  Dancing Queen  ", ""],
      message: " So happy for you ",
      members: next.members.map((member) =>
        member.guestId === ADULT
          ? {
              ...member,
              health: {
                ...toggleDietaryTag(member.health, "NUT_ALLERGY"),
                allergySeverity: "SEVERE_ANAPHYLAXIS" as const,
                allergyNotes: "All tree nuts",
              },
            }
          : member,
      ),
      plusOnes: [
        {
          key: "plus-1",
          name: " Sam Lee ",
          isChild: false,
          health: {
            dietary: ["VEGAN"],
            allergySeverity: "",
            allergyNotes: "",
            accessibilityNotes: "",
          },
        },
      ],
    };

    const body = buildSubmission(next, rules, CONSENT);
    expect(GuestRsvpSubmitSchema.safeParse(body).success).toBe(true);
    expect(body.members).toEqual([
      {
        guestId: ADULT,
        status: "YES",
        health: {
          dietary: ["NUT_ALLERGY"],
          allergySeverity: "SEVERE_ANAPHYLAXIS",
          allergyNotes: "All tree nuts",
        },
      },
      { guestId: CHILD, status: "YES" },
    ]);
    expect(body.plusOnes).toEqual([
      { name: "Sam Lee", isChild: false, health: { dietary: ["VEGAN"] } },
    ]);
    expect(body.songRequests).toEqual(["Dancing Queen"]);
    expect(body.messageToHost).toBe("So happy for you");
    expect(body.healthConsent).toEqual({ granted: true, textShown: CONSENT });
  });

  it("sends nothing the host did not ask for", () => {
    const { rules, draft } = setup({
      config: {
        askDietary: false,
        askAccessibility: false,
        songPrompt: "HIDDEN",
        askMessage: false,
      },
    });
    const next = {
      ...answer(answer(draft, ADULT, "YES"), CHILD, "NO"),
      songs: ["A song"],
      message: "A message",
      email: "linh@example.org",
      contactConsent: true,
    };
    const body = buildSubmission(next, rules, CONSENT);
    expect(body).toEqual({
      members: [
        { guestId: ADULT, status: "YES" },
        { guestId: CHILD, status: "NO" },
      ],
      plusOnes: [],
      songRequests: [],
      locale: "en",
    });
  });

  it("keeps details on file unless the guest chooses to change them", () => {
    const base = party();
    const onFile = party({
      members: [{ ...base.members[0]!, status: "YES", healthOnFile: true }, base.members[1]!],
    });
    const rsvpView = rsvp({ hasResponded: true });
    const rules = rulesFor(config(), onFile, rsvpView);
    const draft = answer(initialDraft(onFile, rsvpView, rules), CHILD, "NO");

    // Kept: no health block at all, so the API leaves what is stored.
    expect(buildSubmission(draft, rules, CONSENT).members[0]).toEqual({
      guestId: ADULT,
      status: "YES",
    });
    expect(carriesHealth(draft, rules)).toBe(false);

    // Changed and cleared: an empty block replaces what is stored, and needs no consent.
    const cleared = {
      ...draft,
      members: draft.members.map((member) =>
        member.guestId === ADULT ? { ...member, editHealth: true } : member,
      ),
    };
    expect(buildSubmission(cleared, rules, CONSENT).members[0]).toEqual({
      guestId: ADULT,
      status: "YES",
      health: { dietary: [] },
    });
    expect(carriesHealth(cleared, rules)).toBe(false);
  });

  it("includes contact details only with consent", () => {
    const { rules, draft } = setup({ config: { askContact: true } });
    const base = { ...answer(answer(draft, ADULT, "YES"), CHILD, "YES"), phone: "0412 345 678" };
    expect(buildSubmission(base, rules, CONSENT).contact).toBeUndefined();
    const body = buildSubmission({ ...base, contactConsent: true }, rules, CONSENT);
    expect(body.contact).toEqual({ phone: "0412 345 678", consentGranted: true });
    expect(GuestRsvpSubmitSchema.safeParse(body).success).toBe(true);
  });
});

describe("helpers", () => {
  it("makes 'no dietary needs' exclusive and clears allergy details with the last allergy tag", () => {
    const empty = {
      dietary: [],
      allergySeverity: "" as const,
      allergyNotes: "",
      accessibilityNotes: "",
    };
    const vegan = toggleDietaryTag(empty, "VEGAN");
    expect(toggleDietaryTag(vegan, "NONE").dietary).toEqual(["NONE"]);
    expect(toggleDietaryTag(toggleDietaryTag(vegan, "NONE"), "HALAL").dietary).toEqual(["HALAL"]);

    const allergy = {
      ...toggleDietaryTag(vegan, "NUT_ALLERGY"),
      allergySeverity: "MILD" as const,
      allergyNotes: "Peanuts",
    };
    const without = toggleDietaryTag(allergy, "NUT_ALLERGY");
    expect(without.allergySeverity).toBe("");
    expect(without.allergyNotes).toBe("");
  });

  it("recognises Australian phone numbers the way the API does", () => {
    expect(looksLikeAuPhone("0412 345 678")).toBe(true);
    expect(looksLikeAuPhone("+61 8 9123 4567")).toBe(true);
    expect(looksLikeAuPhone("12345")).toBe(false);
  });

  it("summarises a reply by its most positive answer", () => {
    expect(replyOutcome([{ status: "NO" }, { status: "YES" }])).toBe("YES");
    expect(replyOutcome([{ status: "NO" }, { status: "MAYBE" }])).toBe("MAYBE");
    expect(replyOutcome([{ status: "NO" }])).toBe("NO");
  });

  it("makes idempotency keys the API accepts (8 to 128 characters), new each time", () => {
    const first = newIdempotencyKey();
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(first.length).toBeLessThanOrEqual(128);
    expect(newIdempotencyKey()).not.toBe(first);
  });
});

describe("failureFor (a reply the API refused)", () => {
  const failures = {
    generic: "generic",
    closed: "closed",
    revoked: "revoked",
    conflict: "conflict",
    changed: "changed",
    plusOnesChanged: "plus-ones changed",
  };
  const shared = "Some details need another look. Check the highlighted fields and try again.";

  it("never tells a guest to check highlighted fields: nothing is highlighted", () => {
    // What the API answers when a person was removed from the party, or "maybe" was switched
    // off, while the guest had the page open.
    const result = failureFor(
      "VALIDATION_ERROR",
      { members: ["Every guest must belong to this invitation"] },
      shared,
      failures,
    );
    expect(result).toEqual({ message: "changed", reload: true });
    expect(failureFor("VALIDATION_ERROR", undefined, shared, failures).message).not.toBe(shared);
  });

  it("says the extra guests are the problem when only they were refused", () => {
    expect(
      failureFor(
        "VALIDATION_ERROR",
        { plusOnes: ["There are not enough seats for the additional guests"] },
        shared,
        failures,
      ),
    ).toEqual({ message: "plus-ones changed", reload: true });
  });

  it("offers a reload when the party is gone", () => {
    expect(failureFor("NOT_FOUND", undefined, "Not found", failures)).toEqual({
      message: "changed",
      reload: true,
    });
  });

  it("keeps the specific messages, without a reload", () => {
    expect(failureFor("RSVP_CLOSED", undefined, "x", failures)).toEqual({
      message: "closed",
      reload: false,
    });
    expect(failureFor("LINK_REVOKED", undefined, "x", failures).message).toBe("revoked");
    expect(failureFor("CONFLICT", undefined, "x", failures).message).toBe("conflict");
    for (const code of ["UNKNOWN", "NETWORK_ERROR", "INTERNAL_ERROR"]) {
      expect(failureFor(code, undefined, "x", failures)).toEqual({
        message: "generic",
        reload: false,
      });
    }
    expect(failureFor("RATE_LIMITED", undefined, "Too many attempts.", failures).message).toBe(
      "Too many attempts.",
    );
  });
});
