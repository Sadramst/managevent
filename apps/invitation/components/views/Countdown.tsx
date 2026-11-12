"use client";

import { useEffect, useState } from "react";

export interface CountdownCopy {
  /** Read out with the tiles, e.g. "Time until the day". */
  label: string;
  days: string;
  day: string;
  hours: string;
  hour: string;
  minutes: string;
  minute: string;
  seconds: string;
  second: string;
}

export interface CountdownProps {
  /** The event start as a UTC instant (`event.startsAt`). */
  startsAt: string;
  copy: CountdownCopy;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingUntil(targetMs: number, nowMs: number): Remaining | null {
  const diff = targetMs - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Days, hours, minutes and seconds to the event. Celebration events only: the server never
 * renders this for a memorial or a past event.
 *
 * The date and time are already in the server HTML above it. This starts empty and fills in
 * after hydration, because "now" differs between the server and the guest's phone; the space is
 * reserved so nothing moves. With reduced motion it ticks once a minute and drops the seconds.
 */
export function Countdown({ startsAt, copy }: CountdownProps) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const target = Date.parse(startsAt);
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(prefersReduced);
    const update = () => setRemaining(remainingUntil(target, Date.now()));
    update();
    const interval = setInterval(update, prefersReduced ? 30_000 : 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  const tiles: { id: string; value: number; label: string }[] = remaining
    ? [
        { id: "d", value: remaining.days, label: remaining.days === 1 ? copy.day : copy.days },
        { id: "h", value: remaining.hours, label: remaining.hours === 1 ? copy.hour : copy.hours },
        {
          id: "m",
          value: remaining.minutes,
          label: remaining.minutes === 1 ? copy.minute : copy.minutes,
        },
        ...(reduced
          ? []
          : [
              {
                id: "s",
                value: remaining.seconds,
                label: remaining.seconds === 1 ? copy.second : copy.seconds,
              },
            ]),
      ]
    : [];

  return (
    <div className="inv-countdown inv-js-only" data-ready={remaining ? "true" : "false"}>
      {remaining ? (
        <>
          {/* Screen readers get one calm sentence, not a value that changes every second. */}
          <p className="sr-only">
            {copy.label}: {remaining.days} {remaining.days === 1 ? copy.day : copy.days},{" "}
            {remaining.hours} {remaining.hours === 1 ? copy.hour : copy.hours}
          </p>
          <ul className="inv-countdown-tiles" aria-hidden="true">
            {tiles.map((tile) => (
              <li key={tile.id} className="inv-countdown-tile">
                <span className="inv-countdown-value num">{tile.value}</span>
                <span className="inv-countdown-unit">{tile.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
