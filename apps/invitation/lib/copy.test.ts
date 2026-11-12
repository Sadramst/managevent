import {
  getInvitationPublic,
  getInvitationShell,
  getInvitationStudio,
  getInvitationStudioGuests,
} from "@managevent/i18n";
import { INVITATION_TEMPLATES } from "@managevent/validators";
import { describe, expect, it } from "vitest";

/**
 * Copy that more than one area of the app shows must say the same thing everywhere. Each area
 * keeps its own module in `packages/i18n`, so these checks hold them together.
 */

describe("template names", () => {
  it("are the same in the public gallery and in the Host Studio", () => {
    const gallery = getInvitationPublic("en").templateNames;
    const studio = getInvitationStudio("en").catalog.templates;
    for (const { slug } of INVITATION_TEMPLATES) {
      expect(studio[slug].name, slug).toBe(gallery[slug].name);
    }
  });
});

describe("public copy describes only what exists", () => {
  // Not built yet: inviting a co-host, and handing the door to someone without the host's own
  // sign-in. Until they are, the public pages must not promise either.
  const text = JSON.stringify(getInvitationPublic("en"));

  it("does not promise co-hosts", () => {
    expect(text).not.toMatch(/co-?hosts?/i);
  });

  it("does not promise a door team", () => {
    expect(text).not.toMatch(/door (team|crew|staff)/i);
  });
});

describe("the card payments notice", () => {
  const notices = [
    getInvitationShell("en").capabilities.stripeCheckoutOff,
    getInvitationStudioGuests("en").common.premium.checkoutOff,
  ];

  it("reads the same wherever Premium is explained", () => {
    expect(new Set(notices).size).toBe(1);
  });

  it("leaves 'Contact us' to the link that follows it", () => {
    // Every page puts a "Contact us" link straight after this sentence; saying it twice in a
    // row reads as a mistake.
    for (const notice of notices) expect(notice).not.toMatch(/contact us/i);
  });
});
