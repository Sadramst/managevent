import { getInvitationStudio } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventCard } from "../event-studio/EventCard";
import { HeroPreviewSwitcher } from "./HeroPreviewSwitcher";

(globalThis as { React?: typeof React }).React = React;

const studioCopy = getInvitationStudio("en");

describe("HeroPreviewSwitcher", () => {
  it("renders 4 celebration theme swatches using theme tokens and marks the initial theme active", () => {
    const html = renderToStaticMarkup(
      <HeroPreviewSwitcher
        initialThemeId="royal-ivory"
        hosts="Elena and Marcus"
        headline="Together with our families"
        title="Wedding Reception"
      />,
    );

    expect(html).toContain('class="pub-hero-switcher"');
    const buttons = [...html.matchAll(/<button[^>]*class="pub-hero-swatch"[^>]*>/g)].map(
      (m) => m[0],
    );
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toContain('aria-pressed="true"');
    expect(buttons[1]).toContain('aria-pressed="false"');
    expect(html).toContain(`--swatch-bg:${INVITATION_THEMES["midnight-celestial"].colors.bg}`);
    expect(html).toContain(
      `--swatch-accent:${INVITATION_THEMES["midnight-celestial"].colors.accentInk}`,
    );
    expect(html).toContain('data-shape="arch"');
  });
});

describe("EventCard", () => {
  const baseEvent = {
    id: "evt_sample",
    title: "Sarah and Daniel",
    ceremonySlug: "wedding",
    experienceMode: "CELEBRATION" as const,
    status: "PLANNING" as const,
    startsAt: "2027-03-20T08:30:00.000Z",
    startsAtLocal: "2027-03-20T16:30:00",
    timeZone: "Australia/Perth",
    role: "OWNER" as const,
    updatedAt: "2026-11-12T08:00:00.000Z",
    invitation: {
      id: "inv_sample",
      eventSlug: "sarah-and-daniel",
      themeId: "royal-ivory" as const,
      templateSlug: "royal-classic" as const,
      plan: "FREE" as const,
      publishedAt: null,
      effectivePlan: "FREE" as const,
    },
    counts: { parties: 2, guests: 4, yes: 2, pending: 2 },
  };

  it("renders the RSVP completion meter when guests exist and omits it when empty", () => {
    const withGuests = renderToStaticMarkup(
      <EventCard event={baseEvent} past={false} copy={studioCopy} />,
    );
    expect(withGuests).toContain('class="es-event-meter"');
    expect(withGuests).toContain("inline-size:50%");

    const empty = renderToStaticMarkup(
      <EventCard
        event={{
          ...baseEvent,
          counts: { parties: 0, guests: 0, yes: 0, pending: 0 },
        }}
        past={false}
        copy={studioCopy}
      />,
    );
    expect(empty).not.toContain('class="es-event-meter"');
  });

  it("marks memorial events with memorial experience mode and omits plan badges", () => {
    const memorial = renderToStaticMarkup(
      <EventCard
        event={{
          ...baseEvent,
          ceremonySlug: "memorial-service",
          experienceMode: "MEMORIAL",
          invitation: {
            ...baseEvent.invitation,
            themeId: "memorial-alabaster",
            templateSlug: "memorial-calm",
          },
        }}
        past={false}
        copy={studioCopy}
      />,
    );
    expect(memorial).toContain('data-experience-mode="memorial"');
    expect(memorial).not.toContain("Free plan");
  });
});
