"use client";

import { useActionState, useEffect, useState } from "react";
import { getExperienceMode, t } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { submitEnquiry } from "../app/actions";
import { localePath } from "../lib/site";
import { resolveVenueName, type VenueRef } from "../lib/venue-prefill";
import type { EstimateTransferPayload } from "./event-estimator";

export function EnquiryForm({
  locale,
  venues = [],
}: {
  locale: EnabledLocale;
  venues?: readonly VenueRef[];
}) {
  const [state, action, pending] = useActionState(submitEnquiry, { status: "idle" });
  const [ceremony, setCeremony] = useState("");
  const [unknownDate, setUnknownDate] = useState(false);
  const [guestEstimate, setGuestEstimate] = useState("");
  const [message, setMessage] = useState("");
  const [venueName, setVenueName] = useState<string | undefined>();
  const mode = getExperienceMode(ceremony);
  const invalid = (name: string) => state.fields?.includes(name) || undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const venueSlug = params.getAll("venue").length === 1 ? params.get("venue") : null;
    const name = resolveVenueName(venueSlug, venues);
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
      setMessage((prev) =>
        prev ? `${customEvent.detail.summaryText}\n\n${prev}` : customEvent.detail.summaryText,
      );
    };
    window.addEventListener("managevent:apply-estimate", handleEstimate);
    return () => window.removeEventListener("managevent:apply-estimate", handleEstimate);
  }, []);

  if (state.status === "sent")
    return (
      <p role="status" className="success">
        {t(locale, "marketing.launchSuccess")}
      </p>
    );
  return (
    <form action={action} noValidate data-experience-mode={mode.toLowerCase()}>
      {state.status === "invalid" && (
        <p role="alert" id="form-errors">
          {t(locale, "marketing.launchInvalid")}
        </p>
      )}
      {state.status === "failed" && <p role="alert">{t(locale, "marketing.launchFailure")}</p>}
      {venueName && (
        <p role="status" className="venue-note">
          {t(locale, "marketing.launchVenueNote", { venue: venueName })}
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
            <option value="wedding">{t(locale, "ceremonies.wedding")}</option>
            <option value="birthday-milestone">{t(locale, "ceremonies.birthdayMilestone")}</option>
            <option value="gala-dinner">{t(locale, "ceremonies.galaDinner")}</option>
            <option value="celebration-of-life">{t(locale, "ceremonies.celebrationOfLife")}</option>
            <option value="memorial-service">{t(locale, "ceremonies.memorialService")}</option>
            <option value="wake">{t(locale, "ceremonies.wake")}</option>
            <option value="other-occasion">{t(locale, "marketing.launchOther")}</option>
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
