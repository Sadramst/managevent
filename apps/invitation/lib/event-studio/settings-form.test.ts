import { invitationStudioEn } from "@managevent/i18n";
import {
  EventSlugWordsSchema,
  MEMORIAL_FORBIDDEN_WELL_FIELDS,
  WellConfigSchema,
} from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  checkSlugWords,
  fromWellForm,
  normaliseSlugWords,
  readDeadline,
  splitEventSlug,
  toWellForm,
  validateWellForm,
  type WellForm,
} from "./settings-form";

const copy = invitationStudioEn.settings.wellErrors;

describe("reply deadline", () => {
  const starts = "2027-03-20T16:30";

  it("treats two blank inputs as no deadline", () => {
    expect(readDeadline("", "", starts)).toEqual({ ok: true, value: null });
  });

  it("needs both a real date and a time", () => {
    expect(readDeadline("2027-03-01", "", starts)).toEqual({ ok: false, error: "incomplete" });
    expect(readDeadline("", "17:00", starts)).toEqual({ ok: false, error: "incomplete" });
    expect(readDeadline("2027-02-30", "17:00", starts)).toEqual({ ok: false, error: "incomplete" });
  });

  it("must fall before the event starts", () => {
    expect(readDeadline("2027-03-01", "23:59", starts)).toEqual({
      ok: true,
      value: "2027-03-01T23:59",
    });
    expect(readDeadline("2027-03-20", "16:29", starts)).toEqual({
      ok: true,
      value: "2027-03-20T16:29",
    });
    expect(readDeadline("2027-03-20", "16:30", starts)).toEqual({
      ok: false,
      error: "after-event",
    });
    expect(readDeadline("2027-04-01", "09:00", starts)).toEqual({
      ok: false,
      error: "after-event",
    });
  });
});

describe("wishing well and tribute book", () => {
  const filled: WellForm = {
    enabled: true,
    message: " Your presence is enough. ",
    payId: "sarah@example.org",
    bsb: "066-123",
    accountNumber: "12345678",
    accountName: "S Chen",
    registryUrl: "https://registry.example.org/sarah-daniel",
    donationUrl: "https://charity.example.org/give",
    tributePrompt: "Share a memory.",
  };

  it("saves a celebration well in a shape the contract accepts, without a tribute prompt", () => {
    expect(validateWellForm(filled, false, copy)).toEqual({});
    const { wellMode, wellConfig } = fromWellForm(filled, false);
    expect(wellMode).toBe("WISHING_WELL");
    expect(WellConfigSchema.parse(wellConfig)).toEqual(wellConfig);
    expect(wellConfig.message).toBe("Your presence is enough.");
    expect(wellConfig.tributePrompt).toBeUndefined();
  });

  it("never sends bank or registry details for a memorial", () => {
    expect(validateWellForm(filled, true, copy)).toEqual({});
    const { wellMode, wellConfig } = fromWellForm(filled, true);
    expect(wellMode).toBe("TRIBUTE_BOOK");
    for (const field of MEMORIAL_FORBIDDEN_WELL_FIELDS) {
      expect(wellConfig[field]).toBeUndefined();
    }
    expect(wellConfig).toEqual({
      message: "Your presence is enough.",
      donationUrl: "https://charity.example.org/give",
      tributePrompt: "Share a memory.",
    });
  });

  it("switching off keeps the details and sets the mode to none", () => {
    const off = fromWellForm({ ...filled, enabled: false }, false);
    expect(off.wellMode).toBe("NONE");
    expect(off.wellConfig.payId).toBe("sarah@example.org");
    expect(toWellForm("NONE", off.wellConfig).enabled).toBe(false);
    expect(toWellForm("WISHING_WELL", off.wellConfig)).toEqual({
      ...filled,
      message: "Your presence is enough.",
      tributePrompt: "",
    });
  });

  it("explains a wrong BSB, account number or link", () => {
    expect(
      validateWellForm(
        {
          ...filled,
          bsb: "12",
          accountNumber: "12 34",
          registryUrl: "registry.example.org",
          donationUrl: "http://charity.example.org",
        },
        false,
        copy,
      ),
    ).toEqual({
      bsb: copy.bsb,
      accountNumber: copy.accountNumber,
      registryUrl: copy.url,
      donationUrl: copy.url,
    });
    for (const bsb of ["066123", "066-123"]) {
      expect(validateWellForm({ ...filled, bsb }, false, copy)).toEqual({});
      expect(WellConfigSchema.safeParse({ bsb }).success).toBe(true);
    }
  });

  it("an empty form saves an empty config", () => {
    const empty = toWellForm("NONE", {});
    expect(fromWellForm({ ...empty, enabled: true }, false)).toEqual({
      wellMode: "WISHING_WELL",
      wellConfig: {},
    });
  });
});

describe("invitation link words", () => {
  it("splits a slug into its words and its fixed suffix", () => {
    expect(splitEventSlug("sarah-and-daniel-x7k2")).toEqual({
      words: "sarah-and-daniel",
      suffix: "x7k2",
    });
    expect(splitEventSlug("event")).toEqual({ words: "event", suffix: "" });
  });

  it("tidies typing into link words", () => {
    expect(normaliseSlugWords("  The Big  Day ")).toBe("the-big-day");
    expect(normaliseSlugWords("our_wedding--2027-")).toBe("our-wedding-2027");
  });

  it("agrees with the contract about what is allowed", () => {
    const samples = [
      "the-big-day",
      "a",
      "2027",
      "",
      "The-Big-Day",
      "big--day",
      "-big",
      "big-",
      "café",
      "big day",
      "x".repeat(60),
      "x".repeat(61),
    ];
    for (const words of samples) {
      const ours = checkSlugWords(words) === "ok";
      const contract = words.length > 0 && EventSlugWordsSchema.safeParse(words).success;
      expect(ours, words).toBe(contract);
    }
    expect(checkSlugWords("")).toBe("required");
    expect(checkSlugWords("x".repeat(61))).toBe("too-long");
    expect(checkSlugWords("Big")).toBe("invalid");
  });
});
