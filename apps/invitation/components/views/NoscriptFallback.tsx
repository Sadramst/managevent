import React from "react";
import { formatCeremonyDate } from "@/lib/i18n";
import type { EventModel } from "@/lib/types";

/**
 * Core who/when/where for guests without JavaScript. The time is rendered in the
 * event time zone (not UTC). Render inside <noscript> in the guest page.
 */
export const NoscriptFallback: React.FC<{ event: EventModel }> = ({ event }) => (
  <div
    style={{
      padding: "2rem",
      fontFamily: "serif",
      background: "#fdfbf7",
      color: "#18181b",
      textAlign: "center",
    }}
  >
    <h1>{event.title}</h1>
    <h2>{event.content.coupleOrHostNames}</h2>
    <p>{event.content.headline}</p>
    <hr style={{ margin: "1rem auto", maxWidth: "300px" }} />
    <p>
      <strong>When:</strong>{" "}
      {formatCeremonyDate(event.startsAt, "en", {
        includeTime: true,
        includeWeekday: true,
        timeZone: event.timeZone,
      })}
    </p>
    <p>
      <strong>Where:</strong> {event.venue.name}, {event.venue.address}
    </p>
  </div>
);
