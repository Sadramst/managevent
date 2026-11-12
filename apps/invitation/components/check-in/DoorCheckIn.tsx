"use client";

import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  CircleCheck,
  CircleX,
  Keyboard,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import {
  type DoorScanInput,
  refreshRosterAction,
  scanAction,
} from "@/app/check-in/[eventId]/actions";
import { Badge, Button, EmptyState, Notice, useSettle } from "@/components/ui";
import {
  type DoorFilter,
  type DoorGuest,
  type DoorRoster,
  doorTotals,
  filterDoorGuests,
  type ScanOutcome,
} from "@/lib/guest-list/door";
import { fill } from "@/lib/guest-list/fill";
import { newUuid } from "@/lib/guest-list/uuid";
import { tableLabelText } from "@/lib/guest-list/view";
import { usePassScanner } from "./usePassScanner";

export interface DoorCheckInProps {
  eventId: string;
  roster: DoorRoster;
  copy: InvitationStudioGuestsCopy["checkIn"];
  common: InvitationStudioGuestsCopy["common"];
  backHref: string;
  guestsHref: string;
}

interface Banner {
  tone: "success" | "warning" | "danger";
  title: string;
  detail: string;
  guest: DoorGuest | null;
  /** Set when the request itself failed, so the same attempt can be sent again. */
  retry: DoorScanInput | null;
}

const REFRESH_EVERY_MS = 20_000;
const OK_BANNER_MS = 6_000;

const BANNER_ICON = { success: CircleCheck, warning: TriangleAlert, danger: CircleX } as const;
const OUTCOME_TONE: Record<ScanOutcome, Banner["tone"]> = {
  OK: "success",
  DUPLICATE: "warning",
  INVALID: "danger",
  WRONG_EVENT: "danger",
};

/**
 * Door mode: live totals, one big search box over the door list, a tap to check a guest in,
 * and (where the browser can) camera scanning of QR passes. Every result is shown with a
 * colour, an icon and words, and announced to screen readers.
 *
 * Built for one hand on a phone: the check-in button is at the inline end of each row, 56px
 * tall, and the result stays pinned under the totals while the list scrolls.
 */
export function DoorCheckIn({
  eventId,
  roster,
  copy,
  common,
  backHref,
  guestsHref,
}: DoorCheckInProps) {
  const [guests, setGuests] = useState(roster.guests);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DoorFilter>("all");
  const [banner, setBanner] = useState<Banner | null>(null);
  /** The guest id (or "qr") of the scan in flight. One at a time keeps results unambiguous. */
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  // Identifies this browser tab in the scan log. Not stored: a new tab is a new device id.
  const [deviceId] = useState(() => `web-${newUuid()}`);
  const busyRef = useRef(false);
  const refreshingRef = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = useSettle();

  const totals = useMemo(() => doorTotals(guests), [guests]);
  const visible = useMemo(() => filterDoorGuests(guests, query, filter), [guests, query, filter]);

  const showBanner = useCallback((next: Banner) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(next);
    if (next.tone === "success") {
      bannerTimer.current = setTimeout(() => setBanner(null), OK_BANNER_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    },
    [],
  );

  const send = useCallback(
    async (input: DoorScanInput) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(input.method === "MANUAL" ? input.guestId : "qr");
      // Venue Wi-Fi drops. A request that fails comes back as a failure (never a throw), and
      // the lock is released whatever happens, so one bad request cannot freeze the door.
      let response: Awaited<ReturnType<typeof scanAction>> | null;
      try {
        response = await run(() => scanAction(eventId, input));
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
      // Signed out: the browser is on its way to the sign-in page.
      if (!response) return;
      if (!response.ok) {
        // `retry` resends the same attempt (same `clientUuid`), so a check-in that did reach
        // the server is not recorded twice.
        showBanner({
          tone: "danger",
          title: copy.result.failed,
          detail: response.message,
          guest: null,
          retry: input,
        });
        return;
      }
      const { result, guest, firstArrivedAt, roster: fresh } = response.data;
      setGuests(fresh.guests);
      const name = guest?.name ?? "";
      const detail =
        result === "OK"
          ? fill(copy.result.okDetail, { name })
          : result === "DUPLICATE"
            ? firstArrivedAt
              ? fill(copy.result.duplicateDetail, { name, time: firstArrivedAt })
              : fill(copy.result.duplicateNoTime, { name })
            : result === "INVALID"
              ? copy.result.invalidDetail
              : copy.result.wrongEventDetail;
      showBanner({
        tone: OUTCOME_TONE[result],
        title: copy.result[result],
        detail,
        guest: result === "OK" || result === "DUPLICATE" ? guest : null,
        retry: null,
      });
    },
    [copy.result, eventId, run, showBanner],
  );

  const checkIn = (guest: DoorGuest) =>
    send({ method: "MANUAL", guestId: guest.guestId, clientUuid: newUuid(), deviceId });

  const scanCode = useCallback(
    (value: string) => {
      void send({ method: "QR", qr: value, clientUuid: newUuid(), deviceId });
    },
    [deviceId, send],
  );

  const scanner = usePassScanner(scanCode);

  const refresh = useCallback(
    async (announce: boolean) => {
      if (busyRef.current || refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      let response: Awaited<ReturnType<typeof refreshRosterAction>> | null;
      try {
        response = await run(() => refreshRosterAction(eventId));
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
      if (!response) return;
      if (response.ok) setGuests(response.data.guests);
      if (announce) setRefreshNote(response.ok ? copy.refreshed : copy.refreshFailed);
    },
    [copy.refreshFailed, copy.refreshed, eventId, run],
  );

  // Keep several door devices in step: refresh quietly while the tab is in front.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const BannerIcon = banner ? BANNER_ICON[banner.tone] : null;
  const percent =
    totals.expected > 0 ? Math.min(100, (totals.checkedIn / totals.expected) * 100) : 0;

  return (
    <div className="sb-door">
      <header className="sb-door-top">
        <div className="wrap sb-door-top-inner">
          <div className="sb-door-title">
            <Link className="icon-button" href={backHref} aria-label={copy.back}>
              <ArrowLeft aria-hidden="true" />
            </Link>
            <div>
              <h1>{copy.title}</h1>
              <p>
                {roster.title} · {roster.startsOn}
              </p>
            </div>
          </div>
          <div className="sb-door-totals">
            <dl aria-label={copy.totals.label}>
              <div>
                <dt>{copy.totals.checkedIn}</dt>
                <dd className="num">{totals.checkedIn}</dd>
              </div>
              <div>
                <dt>{copy.totals.expected}</dt>
                <dd className="num">{totals.expected}</dd>
              </div>
            </dl>
            <div
              className="sb-door-bar"
              role="img"
              aria-label={fill(copy.totals.progress, {
                checkedIn: totals.checkedIn,
                expected: totals.expected,
              })}
            >
              <span style={{ inlineSize: `${percent}%` }} />
            </div>
          </div>
        </div>
        <div className="wrap" aria-live="assertive" aria-atomic="true">
          {banner && BannerIcon ? (
            <div className="sb-door-result" data-tone={banner.tone}>
              <BannerIcon className="sb-door-result-icon" aria-hidden="true" />
              <div className="sb-door-result-text">
                <strong>{banner.title}</strong>
                <span>{banner.detail}</span>
                {banner.guest ? (
                  <span className="sb-door-result-meta">
                    {banner.guest.household}
                    {banner.guest.tableLabel
                      ? ` · ${tableLabelText(banner.guest.tableLabel, common.table)}`
                      : ""}
                    {banner.guest.severeAllergy ? (
                      <Badge tone="danger">
                        <TriangleAlert className="icon" aria-hidden="true" />
                        {copy.row.severe}
                      </Badge>
                    ) : null}
                  </span>
                ) : null}
                {banner.retry ? (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => banner.retry && void send(banner.retry)}
                  >
                    {copy.result.retry}
                  </Button>
                ) : null}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={copy.result.dismiss}
                onClick={() => setBanner(null)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="wrap sb-door-body">
        <div className="sb-door-search">
          <label className="sr-only" htmlFor="door-search">
            {copy.search}
          </label>
          <Search className="icon" aria-hidden="true" />
          <input
            id="door-search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={copy.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.length > 0 ? (
            <button
              type="button"
              className="icon-button"
              aria-label={copy.clearSearch}
              onClick={() => setQuery("")}
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="sb-door-tools">
          <fieldset className="sb-door-filter">
            <legend className="sr-only">{copy.filter.label}</legend>
            {(["all", "waiting", "arrived"] as const).map((value) => (
              <label key={value} className="sb-seg">
                <input
                  type="radio"
                  name="door-filter"
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                />
                <span>{copy.filter[value]}</span>
              </label>
            ))}
          </fieldset>
          <div className="cluster sb-door-buttons">
            {scanner.supported ? (
              <Button
                variant={scanner.active ? "secondary" : "primary"}
                size="small"
                onClick={scanner.active ? scanner.stop : scanner.start}
              >
                {scanner.active ? (
                  <CameraOff className="icon" aria-hidden="true" />
                ) : (
                  <Camera className="icon" aria-hidden="true" />
                )}
                {scanner.active ? copy.scan.stop : copy.scan.camera}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="small"
              aria-expanded={codeOpen}
              onClick={() => setCodeOpen((open) => !open)}
            >
              <Keyboard className="icon" aria-hidden="true" />
              {copy.scan.paste}
            </Button>
            <Button
              variant="ghost"
              size="small"
              pending={refreshing}
              pendingLabel={copy.refreshing}
              onClick={() => void refresh(true)}
            >
              <RefreshCw className="icon" aria-hidden="true" />
              {copy.refresh}
            </Button>
          </div>
        </div>
        <p className="sr-only" role="status">
          {refreshNote}
        </p>

        {scanner.supported ? (
          <div className="sb-door-camera" hidden={!scanner.active}>
            <video ref={scanner.videoRef} muted playsInline aria-label={copy.scan.videoLabel} />
            <p className="notice">{copy.scan.cameraHint}</p>
          </div>
        ) : null}
        {scanner.denied ? (
          <Notice tone="warning" role="alert" className="sb-notice">
            {copy.scan.cameraDenied}
          </Notice>
        ) : null}

        {codeOpen ? (
          <form
            className="sb-door-code"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const value = code.trim();
              if (value.length === 0) {
                setCodeError(copy.scan.pasteEmpty);
                return;
              }
              setCodeError(null);
              setCode("");
              scanCode(value);
            }}
          >
            <div className="field">
              <label className="label" htmlFor="door-code">
                {copy.scan.pasteLabel}
              </label>
              <p className="help" id="door-code-hint">
                {copy.scan.pasteHint}
              </p>
              <div className="field-row">
                <input
                  id="door-code"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={200}
                  aria-describedby={codeError ? "door-code-hint door-code-error" : "door-code-hint"}
                  aria-invalid={codeError ? true : undefined}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <Button type="submit" pending={busy === "qr"}>
                  {copy.scan.pasteSubmit}
                </Button>
              </div>
              {codeError ? (
                <p className="error" id="door-code-error">
                  {codeError}
                </p>
              ) : null}
            </div>
          </form>
        ) : null}

        {guests.length === 0 ? (
          <EmptyState
            title={copy.empty.title}
            actions={
              <Link className="button" href={guestsHref}>
                {copy.empty.action}
              </Link>
            }
          >
            <p>{copy.empty.body}</p>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title={copy.noMatch.title} level={2}>
            <p>{copy.noMatch.body}</p>
          </EmptyState>
        ) : (
          <ul className="sb-door-list">
            {visible.map((guest) => {
              const arrived = guest.arrivedAt !== null;
              const note =
                guest.status === "NO"
                  ? copy.row.notAttending
                  : guest.status === "PENDING"
                    ? copy.row.notReplied
                    : guest.status === "MAYBE"
                      ? copy.row.maybe
                      : null;
              const flags = guest.dietaryFlags.filter((tag) => tag !== "NONE");
              return (
                <li key={guest.guestId} className="sb-door-row" data-arrived={arrived || undefined}>
                  <div className="sb-door-row-main">
                    <p className="sb-door-name">
                      {guest.name}
                      {guest.isChild ? <span className="pill">{common.child}</span> : null}
                    </p>
                    <p className="sb-door-sub">
                      <span>{guest.household}</span>
                      {guest.tableLabel ? (
                        <span>{tableLabelText(guest.tableLabel, common.table)}</span>
                      ) : null}
                      {note ? <span>{note}</span> : null}
                    </p>
                    {guest.severeAllergy || flags.length > 0 ? (
                      <ul className="pills sb-door-flags">
                        {guest.severeAllergy ? (
                          <li>
                            <Badge tone="danger">
                              <TriangleAlert className="icon" aria-hidden="true" />
                              {copy.row.severe}
                            </Badge>
                          </li>
                        ) : null}
                        {flags.map((tag) => (
                          <li key={tag} className="pill">
                            {common.dietary[tag]}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {arrived ? (
                    <p className="sb-door-arrived">
                      <Check className="icon" aria-hidden="true" />
                      {fill(copy.row.checkedInAt, { time: guest.arrivedAt ?? "" })}
                    </p>
                  ) : (
                    <Button
                      className="sb-door-checkin"
                      pending={busy === guest.guestId}
                      pendingLabel={copy.row.checking}
                      disabled={busy !== null}
                      aria-label={fill(copy.row.checkInLabel, { name: guest.name })}
                      onClick={() => void checkIn(guest)}
                    >
                      {copy.row.checkIn}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
