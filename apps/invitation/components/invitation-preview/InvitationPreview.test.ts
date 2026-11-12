import { invitationStudioEn } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvitationPreview, type InvitationPreviewProps } from "./InvitationPreview";

// Vitest compiles JSX with the classic runtime here, which looks for a global `React`.
vi.stubGlobal("React", React);

const labels = invitationStudioEn.preview;

const base: InvitationPreviewProps = {
  themeId: "royal-ivory",
  templateSlug: "royal-classic",
  memorial: false,
  headline: "Sarah and Daniel",
  hosts: "Sarah Chen and Daniel Morris",
  dateLine: "Saturday, 20 March 2027 at 4:30 PM",
  venueName: "Kings Park",
  venueAddress: "Fraser Avenue",
  labels,
};

const render = (props: Partial<InvitationPreviewProps> = {}) =>
  renderToStaticMarkup(React.createElement(InvitationPreview, { ...base, ...props }));

describe("InvitationPreview", () => {
  it("shows who, when and where in the theme colours", () => {
    const html = render();
    expect(html).toContain("Sarah and Daniel");
    expect(html).toContain("Saturday, 20 March 2027 at 4:30 PM");
    expect(html).toContain("Kings Park");
    expect(html).toContain("Hosted by Sarah Chen and Daniel Morris");
    expect(html).toContain(`--pv-accent:${INVITATION_THEMES["royal-ivory"].colors.accent}`);
    expect(html).toContain('data-shape="arch"');
    expect(html).toContain(">RSVP<");
  });

  it("renders a memorial plainly: no arch, no ornament, a gentle label", () => {
    const html = render({
      memorial: true,
      themeId: "memorial-alabaster",
      templateSlug: "memorial-calm",
      honoureeName: "Margaret Ellis",
    });
    expect(html).toContain('data-shape="plain"');
    expect(html).not.toContain("inv-preview-ornament");
    expect(html).toContain("In loving memory of");
    expect(html).toContain("Margaret Ellis");
    expect(html).toContain(">Reply<");
    expect(html).not.toContain(">RSVP<");
  });

  it("uses placeholders until the host has typed something", () => {
    const html = render({ headline: " ", hosts: "", dateLine: "", venueName: "" });
    expect(html).toContain(labels.headlinePlaceholder);
    expect(html).toContain(labels.datePlaceholder);
    expect(html).toContain(labels.venuePlaceholder);
    expect(html).toContain("data-placeholder");
  });

  it("takes the heading colour from the accent on a dark theme", () => {
    const midnight = INVITATION_THEMES["midnight-celestial"].colors;
    const html = render({ themeId: "midnight-celestial", templateSlug: "celestial-evening" });
    expect(html).toContain(`--pv-heading:${midnight.accent}`);
    expect(html).toContain(`--pv-surface:${midnight.surface}`);
  });

  it("falls back to the default theme for an unknown theme id", () => {
    const html = render({ themeId: "not-a-theme" });
    expect(html).toContain(`--pv-bg:${INVITATION_THEMES["royal-ivory"].colors.bg}`);
  });

  it("shows a cover photo only from an https link, never loading it eagerly", () => {
    const withCover = render({ coverImageUrl: "https://images.example.org/cover.jpg" });
    expect(withCover).toContain('src="https://images.example.org/cover.jpg"');
    expect(withCover).toContain('loading="lazy"');
    expect(withCover).toContain('referrerPolicy="no-referrer"');
    expect(render({ coverImageUrl: "http://images.example.org/cover.jpg" })).not.toContain("<img");
    expect(render({ coverImageUrl: "javascript:alert(1)" })).not.toContain("<img");
  });

  it("is hidden from assistive technology as a thumbnail and labelled at full size", () => {
    expect(render({ size: "thumb" })).toContain('aria-hidden="true"');
    expect(render()).toContain(`aria-label="${labels.label}"`);
  });
});
