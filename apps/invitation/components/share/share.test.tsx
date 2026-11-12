import { getInvitationShell, getInvitationStudioGuests } from "@managevent/i18n";
import React, { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReminderEmailForm } from "@/components/awaiting/ReminderEmailForm";
import { PremiumPointer } from "@/components/guest-list/PremiumPointer";
import { DietarySection } from "@/components/responses/DietarySection";
import { ManualCopyField, UiCopyProvider } from "@/components/ui";
import type { PartyView } from "@/lib/guest-list/view";
import { CampaignHistory } from "./CampaignHistory";
import { EmailInvitations } from "./EmailInvitations";

// The forms import server actions; rendering them needs no server.
vi.mock("@/app/studio/[eventId]/share/actions", () => ({
  sendEmailInvitationsAction: vi.fn(),
  revokeLinkAction: vi.fn(),
  reissueLinkAction: vi.fn(),
}));
vi.mock("@/app/studio/[eventId]/awaiting/actions", () => ({ sendRsvpRemindersAction: vi.fn() }));

// Vitest compiles JSX with the classic runtime (tsconfig keeps `jsx: preserve` for Next), so
// the components under test expect `React` in scope at render time.
(globalThis as { React?: typeof React }).React = React;

const copy = getInvitationStudioGuests("en");
const shell = getInvitationShell("en");

const render = (element: ReactElement): string =>
  renderToStaticMarkup(
    <UiCopyProvider
      value={{
        ui: shell.ui,
        errorPage: shell.errorPage,
        networkError: shell.errors.NETWORK_ERROR,
      }}
    >
      {element}
    </UiCopyProvider>,
  );

const party = (displayName: string, extra: Partial<PartyView> = {}): PartyView => ({
  id: `pty_${displayName}`,
  displayName,
  inviteUrl: "http://localhost:3001/i/sample-event-ab12/sample-guest-abcd2345",
  linkOff: false,
  maxSeats: 2,
  allowPlusOnes: false,
  childrenAllowed: true,
  tags: [],
  tableLabel: null,
  status: "PENDING",
  repliedOn: null,
  hasEmail: true,
  emailedOn: null,
  remindersSent: 0,
  phone: null,
  guests: [],
  ...extra,
});

describe("EmailInvitations", () => {
  const html = render(
    <EmailInvitations
      eventId="evt_test"
      parties={[
        party("Sam Taylor"),
        party("The Nguyen family", { emailedOn: "1 November 2026" }),
        party("Jordan Blake", { linkOff: true }),
      ]}
      quota={{ limit: 50, used: 12 }}
      copy={copy.share.email}
      premiumCopy={copy.common.premium}
      premium={null}
    />,
  );

  it("shows the free plan quota", () => {
    expect(html).toContain("12 of 50 emails used on the free plan.");
  });

  it("preselects only households not yet emailed with a working link", () => {
    const boxes = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map((match) => match[0]);
    // Three households and the consent attestation.
    expect(boxes).toHaveLength(4);
    expect(boxes[0]).toContain("checked");
    expect(boxes[1]).not.toContain("checked");
    expect(boxes[2]).not.toContain("checked");
    expect(boxes[2]).toContain("disabled");
    expect(html).toContain("Emailed 1 November 2026");
    expect(html).toContain("Send 1 invitation");
  });

  it("requires the consent attestation, unticked by default", () => {
    const consent = [...html.matchAll(/<input[^>]*aria-required="true"[^>]*>/g)].map((m) => m[0]);
    expect(consent).toHaveLength(1);
    expect(consent[0]).not.toContain("checked");
    expect(html).toContain(copy.share.email.consent.replace(/'/g, "&#x27;"));
  });

  it("says when the plan has no email limit", () => {
    const unlimited = render(
      <EmailInvitations
        eventId="evt_test"
        parties={[party("Sam Taylor")]}
        quota={{ limit: null, used: 3 }}
        copy={copy.share.email}
        premiumCopy={copy.common.premium}
        premium={null}
      />,
    );
    expect(unlimited).toContain("3 emails sent so far. Your plan has no email limit.");
  });
});

describe("ReminderEmailForm", () => {
  it("has one consent tick and one send button", () => {
    const html = render(
      <ReminderEmailForm
        eventId="evt_test"
        timeZone="Australia/Perth"
        copy={copy.awaiting.email}
      />,
    );
    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
    expect(html).toContain("Send reminder emails");
  });
});

describe("CampaignHistory", () => {
  it("lists campaigns with a worded status and counts", () => {
    const html = render(
      <CampaignHistory
        timeZone="Australia/Perth"
        copy={copy.share.history}
        campaigns={[
          {
            id: "cmp_01a1d02f-0f46-7af4-a260-260a82a74d40",
            kind: "INVITE",
            status: "PARTIAL",
            createdAt: "2026-11-12T08:30:00.000Z",
            counts: { total: 10, sent: 8, failed: 2, skipped: 0 },
          },
        ]}
      />,
    );
    expect(html).toContain("12/11/2026, 4:30 PM");
    expect(html).toContain("Invitations");
    expect(html).toContain("Partly sent");
    expect(html).toMatch(
      /<td class="cell-num">10<\/td><td class="cell-num">8<\/td><td class="cell-num">2<\/td>/,
    );
  });
});

describe("PremiumPointer", () => {
  const info = {
    settingsHref: "/studio/evt_test/settings",
    contactHref: "https://www.example/contact",
  };

  it("links to Settings when card payments are on", () => {
    const html = render(<PremiumPointer {...info} stripeCheckout copy={copy.common.premium} />);
    expect(html).toContain('href="/studio/evt_test/settings"');
    expect(html).not.toContain("not switched on");
  });

  it("says card payments are off and offers contact instead of an upgrade link", () => {
    const html = render(
      <PremiumPointer {...info} stripeCheckout={false} copy={copy.common.premium} />,
    );
    expect(html).toContain("Card payments are not switched on yet.");
    expect(html).toContain('href="https://www.example/contact"');
    expect(html).not.toContain("/settings");
  });
});

describe("DietarySection", () => {
  const counts = {
    HALAL: 0,
    VEGETARIAN: 1,
    VEGAN: 0,
    GLUTEN_FREE: 0,
    DAIRY_FREE: 0,
    KOSHER: 0,
    NUT_ALLERGY: 1,
    SHELLFISH_ALLERGY: 0,
    OTHER_ALLERGY: 0,
  };

  it("flags a severe allergy in words, with the notes and a labelled cell for phones", () => {
    const html = render(
      <DietarySection
        copy={copy.responses.dietary}
        common={copy.common}
        matrix={{
          counts,
          byTable: [{ tableLabel: "3", counts, severe: 1 }],
          rows: [
            {
              guestId: "gst_01a1d02f-0f46-7af4-a260-260a82a74d41",
              guestName: "Bao Nguyen",
              partyDisplayName: "The Nguyen family",
              tableLabel: "3",
              isChild: true,
              dietary: ["NUT_ALLERGY"],
              allergySeverity: "SEVERE_ANAPHYLAXIS",
              allergyNotes: "Carries an EpiPen.",
              accessibilityNotes: null,
            },
            {
              guestId: "gst_01a1d02f-0f46-7af4-a260-260a82a74d42",
              guestName: "Anh Nguyen",
              partyDisplayName: "The Nguyen family",
              tableLabel: "3",
              isChild: false,
              dietary: ["VEGETARIAN"],
              allergySeverity: null,
              allergyNotes: null,
              accessibilityNotes: "Step-free access.",
            },
          ],
        }}
      />,
    );
    expect(html).toContain("1 guest has a severe allergy");
    expect(html).toContain("Severe (anaphylaxis)");
    expect(html).toContain("Carries an EpiPen.");
    expect(html).toContain("Step-free access.");
    expect(html).toContain('data-label="Allergy notes"');
    expect(html).toContain("Table 3");
  });

  it("says so when nothing has been shared", () => {
    const html = render(
      <DietarySection
        copy={copy.responses.dietary}
        common={copy.common}
        matrix={{ counts: { ...counts, VEGETARIAN: 0, NUT_ALLERGY: 0 }, byTable: [], rows: [] }}
      />,
    );
    expect(html).toContain("No dietary or access needs have been shared yet.");
  });
});

describe("ManualCopyField (when the browser refuses to copy)", () => {
  it("puts the text itself on the page, in a read-only field with a name and the reason", () => {
    const link = "http://localhost:3001/i/sample-event-ab12/sample-guest-abcd2345";
    const html = render(<ManualCopyField value={link} message={shell.ui.copyFailed} />);
    // "Select the text and copy it yourself" needs the text to be somewhere.
    expect(html).toContain(shell.ui.copyFailed);
    expect(html).toMatch(/<input[^>]*readOnly=""[^>]*>/i);
    expect(html).toContain(`value="${link}"`);
    expect(html).toContain(`aria-label="${shell.ui.copyManual}"`);
  });

  it("uses a text area for a whole message", () => {
    const message = "Hello Sam,\n\nYour invitation is here:\nhttp://localhost:3001/i/a/b";
    const html = render(<ManualCopyField value={message} message={shell.ui.copyFailed} />);
    expect(html).toMatch(/<textarea[^>]*readOnly=""/i);
    expect(html).toContain("Your invitation is here:");
  });
});
