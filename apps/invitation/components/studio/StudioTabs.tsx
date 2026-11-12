"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { routes } from "@/lib/urls";

/** Labels for the event tabs (`getInvitationShell(locale).studio.tabs`). */
export interface StudioTabLabels {
  overview: string;
  design: string;
  content: string;
  guests: string;
  share: string;
  responses: string;
  settings: string;
}

export interface StudioTabsProps {
  eventId: string;
  labels: StudioTabLabels;
  /** Accessible name of the navigation, e.g. "Event sections". */
  navLabel: string;
}

type TabKey = keyof StudioTabLabels;

const TAB_ORDER: readonly TabKey[] = [
  "overview",
  "design",
  "content",
  "guests",
  "share",
  "responses",
  "settings",
];

/**
 * The tab navigation for one event: Overview, Design, Details, Guests, Share, Responses,
 * Settings. These are links between pages (`aria-current="page"`), not an ARIA tablist.
 *
 * The bar sticks under the studio top bar and scrolls sideways on a phone; the current tab is
 * scrolled into view. `/awaiting` belongs to Responses.
 */
export function StudioTabs({ eventId, labels, navLabel }: StudioTabsProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const base = routes.event(eventId);

  const hrefFor = (key: TabKey): string =>
    key === "overview" ? base : routes.eventTab(eventId, key);

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const segment = rest.split("/").filter(Boolean)[0] ?? "";
  const activeKey: TabKey =
    segment === ""
      ? "overview"
      : segment === "awaiting"
        ? "responses"
        : (TAB_ORDER.find((key) => key === segment) ?? "overview");

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    // Scroll only the bar, never the page: centre the current tab when it is out of view.
    const target = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: target, behavior: "instant" });
  }, [activeKey]);

  return (
    <div className="studio-tabs-bar">
      <div className="wrap">
        <nav ref={navRef} className="tabs" aria-label={navLabel}>
          {TAB_ORDER.map((key) => (
            <Link
              key={key}
              className="tab"
              href={hrefFor(key)}
              aria-current={key === activeKey ? "page" : undefined}
            >
              {labels[key]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
