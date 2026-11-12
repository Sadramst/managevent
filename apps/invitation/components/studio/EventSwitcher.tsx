"use client";

import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Menu } from "@/components/ui/Menu";
import { routes } from "@/lib/urls";

export interface EventSwitcherEvent {
  id: string;
  title: string;
}

export interface EventSwitcherCopy {
  switcherLabel: string;
  switcherEmpty: string;
  homeLabel: string;
  newEvent: string;
}

export interface EventSwitcherProps {
  events: readonly EventSwitcherEvent[];
  copy: EventSwitcherCopy;
}

/**
 * The event title in the studio top bar, with a menu to move between events. It reads the
 * current event from the route, so the studio layout can render it once for every page.
 */
export function EventSwitcher({ events, copy }: EventSwitcherProps) {
  const params = useParams<{ eventId?: string }>();
  const current = events.find((event) => event.id === params.eventId);

  return (
    <Menu
      className="studio-switcher"
      align="start"
      label={`${copy.switcherLabel}: ${current?.title ?? copy.homeLabel}`}
      summaryClassName="studio-switcher-toggle"
      summary={
        <>
          <span className="studio-switcher-title">{current?.title ?? copy.homeLabel}</span>
          <ChevronDown aria-hidden="true" />
        </>
      }
    >
      <p className="menu-heading">{copy.switcherLabel}</p>
      <ul className="menu-list">
        <li>
          <Link
            className="menu-item"
            href={routes.studio}
            aria-current={params.eventId ? undefined : "page"}
          >
            {copy.homeLabel}
          </Link>
        </li>
        {events.map((event) => (
          <li key={event.id}>
            <Link
              className="menu-item"
              href={routes.event(event.id)}
              aria-current={event.id === params.eventId ? "page" : undefined}
            >
              {event.title}
            </Link>
          </li>
        ))}
      </ul>
      {events.length === 0 ? <p className="menu-text muted">{copy.switcherEmpty}</p> : null}
      <hr className="menu-sep" />
      <Link className="menu-item" href={routes.studioNew}>
        <Plus className="icon" aria-hidden="true" />
        {copy.newEvent}
      </Link>
    </Menu>
  );
}
