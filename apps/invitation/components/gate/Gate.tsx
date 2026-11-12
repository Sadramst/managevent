"use client";

import type { GateStyle } from "@managevent/validators";
import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArchGlyph } from "@/components/views/Ornaments";

/** Fired on `window` the moment the guest opens the gate (inside their tap), for the music. */
export const GATE_OPENED_EVENT = "inv:opened";

/** The whole sequence, as in the design system (`designTokens.motion.gateMs`). */
const SEQUENCE_MS = 1600;
const PLAIN_FADE_MS = 600;
const MEMORIAL_FADE_MS = 400;
const REDUCED_MOTION_MS = 200;

export interface GateCopy {
  forLabel: string;
  open: string;
  openShort: string;
  hint: string;
  opening: string;
}

export interface GateProps {
  gateStyle: GateStyle;
  /** Memorial events always open with a plain fade. */
  memorial: boolean;
  /** The household name on the closed invitation. */
  name: string;
  /** The same page with `?opened=1`: where the control goes if scripts never load. */
  openHref: string;
  /** The id of the element holding the invitation, kept inert while the gate is closed. */
  contentId: string;
  copy: GateCopy;
}

type GateState = "closed" | "opening" | "open";

/**
 * The closed invitation a guest opens with one tap (or Enter).
 *
 * The invitation itself is server-rendered underneath, so this is only a cover:
 * - without JavaScript it is never shown (`.inv-js-only`), and the guest reads the page;
 * - if scripts are slow or fail, the control is a real link to `?opened=1`, which the server
 *   renders with no gate at all;
 * - once opened, the choice lives in the URL (`?opened=1`), never in storage, so a reload or a
 *   shared in-app browser does not replay it.
 *
 * One sequence of about 1.6 seconds, styled per gate (wax seal, ribbon, arch). Reduced motion
 * and memorial events get a short fade instead; the timings here match `guest.css`.
 */
export function Gate({ gateStyle, memorial, name, openHref, contentId, copy }: GateProps) {
  const style: GateStyle = memorial ? "plain-fade" : gateStyle;
  const [state, setState] = useState<GateState>("closed");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // While the gate covers the page, the invitation behind it cannot be focused or scrolled.
  useEffect(() => {
    if (state === "open") return;
    const content = document.getElementById(contentId);
    const { body } = document;
    const previousOverflow = body.style.overflow;
    content?.setAttribute("inert", "");
    body.style.overflow = "hidden";
    return () => {
      content?.removeAttribute("inert");
      body.style.overflow = previousOverflow;
    };
  }, [contentId, state]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const open = useCallback(() => {
    if (state !== "closed") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced
      ? REDUCED_MOTION_MS
      : memorial
        ? MEMORIAL_FADE_MS
        : style === "plain-fade"
          ? PLAIN_FADE_MS
          : SEQUENCE_MS;

    setState("opening");
    window.dispatchEvent(new Event(GATE_OPENED_EVENT));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("opened", "1");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Some embedded browsers refuse history changes; the gate still opens.
    }

    timer.current = setTimeout(() => {
      setState("open");
      // Hand focus to the invitation so a keyboard or screen-reader user starts at its top.
      const content = document.getElementById(contentId);
      content?.removeAttribute("inert");
      content?.focus({ preventScroll: true });
    }, duration);
  }, [contentId, memorial, state, style]);

  // Enter or Space opens the invitation from anywhere on the closed gate, so a keyboard user
  // does not have to find the control first.
  useEffect(() => {
    if (state !== "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, state]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // A modified click (new tab) keeps the plain link behaviour.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  };

  if (state === "open") return null;

  const sealed = style === "wax-seal" || style === "ribbon";

  return (
    <div
      className="inv-gate inv-js-only"
      data-gate={style}
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-label={copy.open}
    >
      {style === "arch" ? (
        <>
          <span className="inv-gate-door" data-side="start" aria-hidden="true" />
          <span className="inv-gate-door" data-side="end" aria-hidden="true" />
        </>
      ) : null}

      <div className="inv-gate-card">
        {style === "wax-seal" ? (
          <svg
            className="inv-gate-flap"
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path className="inv-gate-flap-fill" d="M0 0H100L50 44Z" />
            <path
              className="inv-gate-flap-line"
              d="M0 0L50 44L100 0"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}
        {style === "ribbon" ? (
          <>
            <span className="inv-gate-ribbon" data-side="start" aria-hidden="true" />
            <span className="inv-gate-ribbon" data-side="end" aria-hidden="true" />
          </>
        ) : null}

        <div className="inv-gate-text">
          <p className="inv-gate-for">{copy.forLabel}</p>
          <p className="inv-gate-name">{name}</p>
        </div>

        <a
          href={openHref}
          className={sealed ? "inv-gate-open" : "inv-gate-open inv-gate-open-plain"}
          onClick={onClick}
          aria-label={copy.open}
          aria-busy={state === "opening" || undefined}
        >
          {sealed ? (
            <span className="inv-seal" aria-hidden="true">
              <ArchGlyph />
            </span>
          ) : null}
          <span className={sealed ? "inv-gate-hint" : "button button-large"} aria-hidden="true">
            {sealed ? copy.hint : memorial ? copy.openShort : copy.open}
          </span>
        </a>
      </div>

      <p className="sr-only" role="status">
        {state === "opening" ? copy.opening : ""}
      </p>
    </div>
  );
}
