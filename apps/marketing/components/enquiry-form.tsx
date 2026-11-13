"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { getExperienceMode, t, type TranslationKey } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { submitEnquiry } from "../app/actions";
import { invitationLinks, localePath } from "../lib/site";
import { resolveVenueName, type VenueRef } from "../lib/venue-prefill";
import type { EstimateTransferPayload } from "./event-estimator";

export interface CeremonyOption {
  slug: string;
  label: string;
}

/** Used only when a page does not pass the ceremony catalogue from `/content`. */
const FALLBACK_CEREMONIES: readonly { slug: string; label: TranslationKey }[] = [
  { slug: "wedding", label: "ceremonies.wedding" },
  { slug: "birthday-milestone", label: "ceremonies.birthdayMilestone" },
  { slug: "gala-dinner", label: "ceremonies.galaDinner" },
  { slug: "celebration-of-life", label: "ceremonies.celebrationOfLife" },
  { slug: "memorial-service", label: "ceremonies.memorialService" },
  { slug: "wake", label: "ceremonies.wake" },
];
const OTHER_OCCASION = "other-occasion";

/**
 * The enquiry form used on the home page (#enquiry) and on /contact. It posts through a server
 * action, so it submits without JavaScript; the prefill effects below are enhancements only.
 */
export function EnquiryForm({
  locale,
  ceremonies,
  venues = [],
}: {
  locale: EnabledLocale;
  /** The occasions offered in the select, normally every ceremony that has a page. */
  ceremonies?: readonly CeremonyOption[];
  venues?: readonly VenueRef[];
}) {
  const options = useMemo<CeremonyOption[]>(
    () => [
      ...(ceremonies ??
        FALLBACK_CEREMONIES.map((option) => ({
          slug: option.slug,
          label: t(locale, option.label),
        }))),
      { slug: OTHER_OCCASION, label: t(locale, "marketing.launchOther") },
    ],
    [ceremonies, locale],
  );
  const [state, action, pending] = useActionState(submitEnquiry, { status: "idle" });
  const [ceremony, setCeremony] = useState("");
  const [unknownDate, setUnknownDate] = useState(false);
  const [guestEstimate, setGuestEstimate] = useState("");
  const [message, setMessage] = useState("");
  const [venueName, setVenueName] = useState<string | undefined>();
  const [estimateApplied, setEstimateApplied] = useState(false);
  const mode = getExperienceMode(ceremony);
  const invalid = (name: string) => state.fields?.includes(name) || undefined;

  useEffect(() => {
    // Ceremony pages link here with ?ceremony=<slug>; only known options are accepted.
    const requested = new URLSearchParams(window.location.search).getAll("ceremony");
    const slug = requested.length === 1 ? requested[0] : undefined;
    if (slug && options.some((option) => option.slug === slug)) {
      setCeremony((current) => current || slug);
    }
  }, [options]);

  useEffect(() => {
    const name = resolveVenueName(
      new URLSearchParams(window.location.search).getAll("venue").length === 1
        ? new URLSearchParams(window.location.search).get("venue")
        : null,
      venues,
    );
    if (!name) return;
    setVenueName(name);
    setMessage((prev) => prev || t(locale, "marketing.launchVenuePrefill", { venue: name }));
  }, [locale, venues]);

  useEffect(() => {
    const handleEstimate = (event: Event) => {
      const customEvent = event as CustomEvent<EstimateTransferPayload>;
      if (!customEvent.detail) return;
      setCeremony(customEvent.detail.ceremonySlug);
      setGuestEstimate(String(customEvent.detail.guests));
      setEstimateApplied(true);
      setMessage((prev) =>
        prev ? `${customEvent.detail.summaryText}\n\n${prev}` : customEvent.detail.summaryText,
      );
    };
    window.addEventListener("managevent:apply-estimate", handleEstimate);
    return () => window.removeEventListener("managevent:apply-estimate", handleEstimate);
  }, []);

  if (state.status === "sent")
    return (
      <div role="status" className="success enquiry-confirmation">
        <span className="badge badge-success">Enquiry received</span>
        <p>{t(locale, "marketing.launchSuccess")}</p>
        <div className="stack-xs">
          <strong>{t(locale, "marketing.launchSuccessNextTitle")}</strong>
          <p className="muted">{t(locale, "marketing.launchSuccessNextBody")}</p>
          <div className="actions">
            <a className="btn btn-primary" href={invitationLinks.create}>
              {t(locale, "marketing.launchSuccessCreateBtn")}
            </a>
            <a className="btn btn-secondary" href={invitationLinks.templates}>
              {t(locale, "marketing.launchSuccessBrowseBtn")}
            </a>
          </div>
        </div>
      </div>
    );
  return (
    <form action={action} noValidate data-experience-mode={mode.toLowerCase()}>
      {state.status === "invalid" && (
        <p role="alert" id="form-errors" className="alert alert-danger enquiry-alert">
          {t(locale, "marketing.launchInvalid")}
        </p>
      )}
      {state.status === "failed" && (
        <p role="alert" className="alert alert-danger enquiry-alert">
          {t(locale, "marketing.launchFailure")}
        </p>
      )}
      {venueName && (
        <p role="status" className="alert venue-note">
          {t(locale, "marketing.launchVenueNote", { venue: venueName })}
        </p>
      )}
      {estimateApplied && (
        <p aria-live="polite" className="alert estimate-note">
          Estimate attached from the guide above — adjust any details below if needed.
        </p>
      )}
      <div className="fields">
        <label>
          {t(locale, "marketing.launchName")}
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={160}
            aria-invalid={invalid("name")}
            aria-describedby={invalid("name") ? "form-errors" : undefined}
          />
        </label>
        <label>
          {t(locale, "marketing.launchEmail")}
          <input
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            aria-invalid={invalid("email")}
            aria-describedby={invalid("email") ? "form-errors" : undefined}
          />
        </label>
        <label>
          {t(locale, "marketing.launchPhone")}
          <input
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            aria-invalid={invalid("phone")}
          />
        </label>
        <label>
          {t(locale, "marketing.launchCeremony")}
          <select
            name="ceremonySlug"
            value={ceremony}
            onChange={(event) => setCeremony(event.target.value)}
          >
            <option value="">{t(locale, "marketing.launchChoose")}</option>
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(locale, "marketing.launchDate")}
          <input
            name="eventDate"
            type="date"
            disabled={unknownDate}
            aria-invalid={invalid("eventDate")}
          />
        </label>
        <label>
          {t(locale, "marketing.launchGuests")}
          <input
            name="guestEstimate"
            type="number"
            min="1"
            max="5000"
            inputMode="numeric"
            value={guestEstimate}
            onChange={(event) => setGuestEstimate(event.target.value)}
            aria-invalid={invalid("guestEstimate")}
          />
        </label>
      </div>
      <input type="hidden" name="dateFlexible" value={String(unknownDate)} />
      <label className="check">
        <input
          type="checkbox"
          name="dateUnknown"
          checked={unknownDate}
          onChange={(event) => setUnknownDate(event.target.checked)}
        />
        {t(locale, "marketing.launchDateUnknown")}
      </label>
      <label>
        {t(locale, "marketing.launchMessage")}
        <textarea
          name="message"
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <input type="hidden" name="preferredLanguage" value="en" />
      <div hidden aria-hidden="true">
        <label>
          Website
          <input name="websiteUrl" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="check">
        <input name="marketingConsent" type="checkbox" />
        {t(locale, "marketing.launchConsent")}
      </label>
      <p className="notice">
        {t(locale, "marketing.launchNotice")}{" "}
        <a href={localePath(locale, "/privacy")}>{t(locale, "marketing.launchPrivacy")}</a>
      </p>
      <button className="button" type="submit" disabled={pending}>
        {t(locale, pending ? "marketing.launchSending" : "marketing.launchSubmit")}
      </button>
    </form>
  );
}
