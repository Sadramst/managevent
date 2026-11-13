"use client";

import { useActionState, useState } from "react";
import type { AdminPagesCopy } from "@managevent/i18n";
import { fillCopy } from "@managevent/i18n";
import type { AdminSiteSettings } from "@managevent/validators";
import { type SiteSettingsFormState, saveSiteSettings } from "../app/admin/actions";
import { FormOutcome } from "./admin-lead-forms";

type SettingsCopy = AdminPagesCopy["settings"];
type Field = keyof SettingsCopy["fieldErrors"];

/**
 * The contact details form. The boxes are controlled, so a failed save never loses what was
 * typed, and the "currently sending to" line follows what the server last saved.
 */
export function SiteSettingsForm({
  initial,
  copy,
  errors,
}: {
  initial: AdminSiteSettings;
  copy: SettingsCopy;
  errors: AdminPagesCopy["errors"];
}) {
  const [state, action, pending] = useActionState<SiteSettingsFormState, FormData>(
    saveSiteSettings,
    null,
  );
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone);
  const [notificationEmail, setNotificationEmail] = useState(
    initial.notificationEmailIsCustom ? initial.notificationEmail : "",
  );
  const current = state?.ok ? state.data.settings : initial;
  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const invalid = (field: Field) => Boolean(fieldErrors[field]);
  const describedBy = (field: Field, help: string) =>
    invalid(field) ? `${help} settings-${field}-error` : help;

  return (
    <form action={action} aria-busy={pending} noValidate data-testid="settings-form">
      <section className="card" aria-labelledby="settings-contact">
        <h2 className="console-card-title" id="settings-contact">
          {copy.contactTitle}
        </h2>
        <p className="help">{copy.contactHelp}</p>

        <div className="field">
          <label htmlFor="settings-contactEmail">{copy.contactEmail}</label>
          <input
            id="settings-contactEmail"
            name="contactEmail"
            type="email"
            inputMode="email"
            autoComplete="off"
            required
            maxLength={254}
            dir="ltr"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            aria-invalid={invalid("contactEmail") || undefined}
            aria-describedby={describedBy("contactEmail", "settings-contactEmail-help")}
          />
          <p className="help" id="settings-contactEmail-help">
            {copy.contactEmailHelp}
          </p>
          {invalid("contactEmail") ? (
            <p className="console-field-error" id="settings-contactEmail-error">
              {copy.fieldErrors.contactEmail}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="settings-contactPhone">{copy.contactPhone}</label>
          <input
            id="settings-contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={24}
            dir="ltr"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            aria-invalid={invalid("contactPhone") || undefined}
            aria-describedby={describedBy("contactPhone", "settings-contactPhone-help")}
          />
          <p className="help" id="settings-contactPhone-help">
            {copy.contactPhoneHelp}
          </p>
          {invalid("contactPhone") ? (
            <p className="console-field-error" id="settings-contactPhone-error">
              {copy.fieldErrors.contactPhone}
            </p>
          ) : null}
        </div>
      </section>

      <section className="card" aria-labelledby="settings-alerts">
        <h2 className="console-card-title" id="settings-alerts">
          {copy.notificationTitle}
        </h2>
        <p className="help">{copy.notificationHelp}</p>
        <div className="field">
          <label htmlFor="settings-notificationEmail">{copy.notificationEmail}</label>
          <input
            id="settings-notificationEmail"
            name="notificationEmail"
            type="email"
            inputMode="email"
            autoComplete="off"
            maxLength={254}
            dir="ltr"
            value={notificationEmail}
            onChange={(event) => setNotificationEmail(event.target.value)}
            aria-invalid={invalid("notificationEmail") || undefined}
            aria-describedby={describedBy("notificationEmail", "settings-notificationEmail-help")}
          />
          <p className="help" id="settings-notificationEmail-help">
            {copy.notificationEmailHelp}{" "}
            <span data-testid="settings-alert-target">
              {fillCopy(copy.notificationUsing, { email: current.notificationEmail })}
            </span>
          </p>
          {invalid("notificationEmail") ? (
            <p className="console-field-error" id="settings-notificationEmail-error">
              {copy.fieldErrors.notificationEmail}
            </p>
          ) : null}
        </div>
      </section>

      <div className="form-actions">
        <button type="submit" className="button" disabled={pending} aria-busy={pending}>
          {pending ? copy.saving : copy.save}
        </button>
      </div>
      {pending ? null : (
        <FormOutcome state={state} saved={copy.saved} errors={errors} id="settings-outcome" />
      )}
    </form>
  );
}
