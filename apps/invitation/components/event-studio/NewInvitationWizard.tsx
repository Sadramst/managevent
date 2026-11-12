"use client";

import { ArrowLeft, ArrowRight, Check, Lock, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InvitationStudioCopy } from "@managevent/i18n";
import {
  InvitationPreview,
  type InvitationPreviewLabels,
} from "@/components/invitation-preview/InvitationPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { createEventAction } from "@/lib/event-studio/actions";
import { settle } from "@/lib/client-action";
import type { OccasionOption, TemplateOption, TimeZoneOption } from "@/lib/event-studio/catalog";
import { defaultTemplateFor } from "@/lib/event-studio/design-rules";
import {
  type DateNames,
  fill,
  formatDateTimeInputs,
  todayIso,
} from "@/lib/event-studio/local-date";
import {
  type BasicsErrors,
  countHouseholds,
  type HouseholdErrors,
  type HouseholdRow,
  rowKey,
  toEventCreateInput,
  toFirstParties,
  validateBasics,
  validateHouseholds,
  WIZARD_MAX_HOUSEHOLDS,
  WIZARD_STEPS,
  type WizardBasics,
  type WizardStep,
} from "@/lib/event-studio/wizard";
import { UnsavedGuard, type UnsavedGuardCopy } from "./UnsavedGuard";

export interface NewInvitationWizardProps {
  occasions: OccasionOption[];
  templates: TemplateOption[];
  timeZones: TimeZoneOption[];
  /** `?template=` when it names a real template; null otherwise. */
  requestedTemplate: string | null;
  /** Sample invitation paths by template slug (from the API's published samples). */
  samples: Record<string, string>;
  /** Guests the free plan covers (`INVITATION_PLANS.FREE.maxGuests`). */
  freeGuestLimit: number | null;
  defaultTimeZone: string;
  copy: {
    wizard: InvitationStudioCopy["wizard"];
    preview: InvitationPreviewLabels & { title: string; note: string };
    badges: { premium: string; free: string };
    dateNames: DateNames;
    unsaved: UnsavedGuardCopy;
    optional: string;
    /** Shown when the request never reached the server. */
    networkError: string;
  };
}

const EMPTY_BASICS: Omit<WizardBasics, "timeZone"> = {
  title: "",
  hosts: "",
  honoureeName: "",
  date: "",
  startTime: "",
  endTime: "",
  venueName: "",
  venueAddress: "",
};

/** A copy of a record without one key. */
function without<T extends object>(record: T, key: PropertyKey): T {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key)) as T;
}

function isStep(value: string): value is WizardStep {
  return (WIZARD_STEPS as readonly string[]).includes(value);
}

/** Field names in the API's validation answer, mapped to the wizard's own fields. */
const SERVER_FIELD: Record<string, keyof WizardBasics> = {
  title: "title",
  hosts: "hosts",
  honoureeName: "honoureeName",
  startsAtLocal: "date",
  endsAtLocal: "endTime",
  timeZone: "timeZone",
  venue: "venueName",
};

/**
 * The new-invitation wizard: occasion and template, the basics, a few first guests, review.
 *
 * Everything is kept in this component until "Create invitation", so going back and forth
 * loses nothing. Each step is checked before moving on, with the message beside the field and
 * focus moved to the first problem. The step is mirrored in the URL hash, so the browser's
 * Back button steps back through the wizard instead of leaving it.
 */
export function NewInvitationWizard({
  occasions,
  templates,
  timeZones,
  requestedTemplate,
  samples,
  freeGuestLimit,
  defaultTimeZone,
  copy,
}: NewInvitationWizardProps) {
  const text = copy.wizard;
  const requested = templates.find((template) => template.slug === requestedTemplate) ?? null;
  const initialOccasion =
    occasions.find((occasion) => occasion.mode === (requested?.mode ?? "CELEBRATION")) ??
    occasions[0];

  const [step, setStep] = useState<WizardStep>("template");
  const [occasionSlug, setOccasionSlug] = useState(initialOccasion?.slug ?? "");
  const [templateSlug, setTemplateSlug] = useState(() => {
    const mode = requested?.mode ?? "CELEBRATION";
    const usable = requested && (requested.free || requested.mode === "MEMORIAL");
    return (usable ? requested : defaultTemplateFor(templates, mode))?.slug ?? "";
  });
  const [basics, setBasics] = useState<WizardBasics>({
    ...EMPTY_BASICS,
    timeZone: defaultTimeZone,
  });
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [basicsErrors, setBasicsErrors] = useState<BasicsErrors>({});
  const [householdErrors, setHouseholdErrors] = useState<HouseholdErrors>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** True from the first tap on Create until it fails: state alone lags a second tap. */
  const creating = useRef(false);
  const [touched, setTouched] = useState(false);
  const [today, setToday] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusHeading = useRef(false);

  const occasion = occasions.find((item) => item.slug === occasionSlug) ?? initialOccasion;
  const memorial = occasion?.mode === "MEMORIAL";
  const mode = occasion?.mode ?? "CELEBRATION";
  const modeTemplates = useMemo(
    () => templates.filter((template) => template.mode === mode),
    [templates, mode],
  );
  const template = modeTemplates.find((item) => item.slug === templateSlug) ?? modeTemplates[0];
  const guestLimit = memorial ? null : freeGuestLimit;
  const totals = countHouseholds(households);
  const overLimit = guestLimit !== null && totals.guests > guestLimit;
  const stepIndex = WIZARD_STEPS.indexOf(step);

  // The browser's own date, known only after mounting (the server may be in another time zone).
  useEffect(() => {
    setToday(todayIso());
  }, []);

  // Mirror the step in the URL hash so Back and Forward move between steps.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", "#template");
    const onPopState = () => {
      const hash = window.location.hash.slice(1);
      focusHeading.current = true;
      setStep(isStep(hash) ? hash : "template");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const goTo = useCallback((next: WizardStep) => {
    focusHeading.current = true;
    setStepError(null);
    setStep(next);
    window.history.pushState(window.history.state, "", `#${next}`);
  }, []);

  const focusFirstInvalid = () => {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const setBasic = <K extends keyof WizardBasics>(key: K, value: WizardBasics[K]) => {
    setTouched(true);
    setBasics((current) => ({ ...current, [key]: value }));
    if (basicsErrors[key]) setBasicsErrors((current) => without(current, key));
  };

  const chooseOccasion = (slug: string) => {
    setTouched(true);
    setOccasionSlug(slug);
    const nextMode = occasions.find((item) => item.slug === slug)?.mode ?? "CELEBRATION";
    if (nextMode !== mode) setTemplateSlug(defaultTemplateFor(templates, nextMode)?.slug ?? "");
  };

  const checkBasics = (): boolean => {
    const errors = validateBasics(basics, { today: today || todayIso() }, text.errors);
    setBasicsErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkHouseholds = (): boolean => {
    const errors = validateHouseholds(households, text.guests);
    setHouseholdErrors(errors);
    return Object.keys(errors).length === 0 && !overLimit;
  };

  const next = () => {
    if (step === "template") return goTo("basics");
    if (step === "basics") {
      if (checkBasics()) return goTo("guests");
      setStepError(text.fixErrors);
      return focusFirstInvalid();
    }
    if (step === "guests") {
      if (checkHouseholds()) return goTo("review");
      setStepError(overLimit ? null : text.fixErrors);
      return focusFirstInvalid();
    }
  };

  const back = () => {
    const previous = WIZARD_STEPS[stepIndex - 1];
    if (previous) goTo(previous);
  };

  const create = async () => {
    if (pending || creating.current || !occasion || !template) return;
    if (!checkBasics()) {
      goTo("basics");
      setStepError(text.fixErrors);
      return;
    }
    if (!checkHouseholds()) {
      goTo("guests");
      return;
    }
    creating.current = true;
    setPending(true);
    setSubmitError(null);
    const result = await settle(
      () =>
        createEventAction(
          toEventCreateInput({
            ceremonySlug: occasion.slug,
            templateSlug: template.slug,
            memorial,
            basics,
          }),
          toFirstParties(households),
        ),
      copy.networkError,
    );
    // A success redirects to the new event and never returns a result (`settle` gives null for
    // a redirect): stay busy until the new page is shown, so a second tap cannot create a
    // second event.
    if (!result || result.ok) return;
    creating.current = false;
    setPending(false);
    const serverErrors: BasicsErrors = {};
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      const key = SERVER_FIELD[field];
      if (key && messages.length > 0) serverErrors[key] = text.errors.checkField;
    }
    if (Object.keys(serverErrors).length > 0) {
      setBasicsErrors(serverErrors);
      goTo("basics");
      setStepError(result.message);
    } else {
      setSubmitError(result.message);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "review") void create();
    else next();
  };

  const updateHousehold = (key: string, patch: Partial<HouseholdRow>) => {
    setTouched(true);
    setHouseholds((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    if (householdErrors[key]) setHouseholdErrors((current) => without(current, key));
  };

  const addHousehold = () => {
    setTouched(true);
    const key = rowKey();
    setHouseholds((rows) => [...rows, { key, name: "", people: "" }]);
    requestAnimationFrame(() => document.getElementById(`household-${key}-name`)?.focus());
  };

  const removeHousehold = (key: string) => {
    setHouseholds((rows) => rows.filter((row) => row.key !== key));
    requestAnimationFrame(() => document.getElementById("wizard-add-household")?.focus());
  };

  const countLabel = [
    totals.households === 1
      ? text.guests.householdsOne
      : fill(text.guests.householdsMany, { count: totals.households }),
    totals.guests === 1
      ? text.guests.guestsOne
      : fill(text.guests.guestsMany, { count: totals.guests }),
  ].join(", ");
  const dateLine = formatDateTimeInputs(basics.date, basics.startTime, copy.dateNames);
  const requestedNotice =
    requested && template && requested.slug !== template.slug && step === "template"
      ? fill(
          requested.mode === mode
            ? text.template.requestedPremium
            : text.template.requestedOtherMode,
          {
            template: requested.name,
            fallback: template.name,
          },
        )
      : null;

  const preview = (
    <InvitationPreview
      themeId={template?.defaultThemeId ?? ""}
      templateSlug={template?.slug ?? ""}
      memorial={memorial}
      headline={basics.title}
      hosts={basics.hosts}
      honoureeName={memorial ? basics.honoureeName : undefined}
      dateLine={dateLine}
      venueName={basics.venueName}
      venueAddress={basics.venueAddress}
      labels={copy.preview}
    />
  );

  return (
    <div className="es-wizard" data-experience-mode={memorial ? "memorial" : undefined}>
      <UnsavedGuard dirty={touched && !pending} copy={copy.unsaved} />

      <nav className="es-steps" aria-label={text.progressLabel}>
        <p className="es-steps-count">
          {fill(text.stepOf, { current: stepIndex + 1, total: WIZARD_STEPS.length })}
        </p>
        <ol>
          {WIZARD_STEPS.map((item, index) => {
            const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
            return (
              <li
                key={item}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? (
                  <button
                    type="button"
                    className="es-step"
                    onClick={() => goTo(item)}
                    disabled={pending}
                  >
                    <span className="es-step-mark" aria-hidden="true">
                      <Check />
                    </span>
                    {text.steps[item]}
                  </button>
                ) : (
                  <span className="es-step">
                    <span className="es-step-mark" aria-hidden="true">
                      {index + 1}
                    </span>
                    {text.steps[item]}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="es-wizard-grid">
        <form ref={formRef} className="es-wizard-form" onSubmit={onSubmit} noValidate>
          {step === "template" ? (
            <>
              <div className="es-step-head">
                <h2 ref={headingRef} tabIndex={-1}>
                  {text.template.heading}
                </h2>
                <p className="muted">{text.template.lead}</p>
              </div>

              <fieldset className="es-fieldset">
                <legend>{text.template.occasionLegend}</legend>
                {(["CELEBRATION", "MEMORIAL"] as const).map((group) => (
                  <div key={group} className="es-chip-group">
                    <p className="es-chip-group-label" id={`occasion-group-${group}`}>
                      {group === "CELEBRATION"
                        ? text.template.celebrations
                        : text.template.memorials}
                    </p>
                    <div
                      className="es-chips"
                      role="group"
                      aria-labelledby={`occasion-group-${group}`}
                    >
                      {occasions
                        .filter((item) => item.mode === group)
                        .map((item) => (
                          <label key={item.slug} className="es-chip">
                            <input
                              type="radio"
                              name="occasion"
                              value={item.slug}
                              checked={item.slug === occasionSlug}
                              onChange={() => chooseOccasion(item.slug)}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </fieldset>

              {memorial ? <Notice>{text.template.memorialNote}</Notice> : null}

              <fieldset className="es-fieldset">
                <legend>{text.template.templateLegend}</legend>
                <p className="help">{text.template.templateLead}</p>
                {requestedNotice ? (
                  <Notice className="es-gap" role="status">
                    {requestedNotice}
                  </Notice>
                ) : null}
                <div className="es-choices">
                  {modeTemplates.map((item) => {
                    const locked = !memorial && !item.free;
                    const sample = samples[item.slug];
                    return (
                      <div
                        key={item.slug}
                        className="es-choice"
                        data-selected={item.slug === template?.slug ? true : undefined}
                        data-locked={locked ? true : undefined}
                      >
                        <label className="es-choice-label">
                          <input
                            type="radio"
                            name="template"
                            value={item.slug}
                            checked={item.slug === template?.slug}
                            disabled={locked}
                            onChange={() => {
                              setTouched(true);
                              setTemplateSlug(item.slug);
                            }}
                          />
                          <InvitationPreview
                            size="thumb"
                            themeId={item.defaultThemeId}
                            templateSlug={item.slug}
                            memorial={memorial}
                            headline={basics.title}
                            hosts={basics.hosts}
                            dateLine=""
                            labels={copy.preview}
                          />
                          <span className="es-choice-text">
                            <span className="es-choice-name">
                              {item.name}
                              {memorial ? null : locked ? (
                                <Badge>
                                  <Lock className="icon" aria-hidden="true" />
                                  {copy.badges.premium}
                                </Badge>
                              ) : (
                                <Badge tone="neutral">{copy.badges.free}</Badge>
                              )}
                            </span>
                            <span className="es-choice-desc">{item.description}</span>
                          </span>
                        </label>
                        {sample ? (
                          <a
                            className="link es-choice-link"
                            href={sample}
                            target="_blank"
                            rel="noopener"
                          >
                            {text.template.viewSample}
                            <span className="sr-only">
                              : {item.name} ({text.template.newTab})
                            </span>
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {!memorial && modeTemplates.some((item) => !item.free) ? (
                  <p className="help es-gap-top">{text.template.premiumLocked}</p>
                ) : null}
              </fieldset>
            </>
          ) : null}

          {step === "basics" ? (
            <>
              <div className="es-step-head">
                <h2 ref={headingRef} tabIndex={-1}>
                  {text.basics.heading}
                </h2>
                <p className="muted">{text.basics.lead}</p>
              </div>
              {stepError ? (
                <Notice tone="danger" role="alert" className="es-gap">
                  {stepError}
                </Notice>
              ) : null}

              <TextField
                id="wizard-title"
                label={text.basics.title}
                hint={memorial ? text.basics.titleHintMemorial : text.basics.titleHint}
                error={basicsErrors.title}
                value={basics.title}
                onChange={(event) => setBasic("title", event.target.value)}
                maxLength={160}
                autoComplete="off"
                required
              />
              {memorial ? (
                <TextField
                  id="wizard-honouree"
                  label={text.basics.honouree}
                  optional={copy.optional}
                  error={basicsErrors.honoureeName}
                  value={basics.honoureeName}
                  onChange={(event) => setBasic("honoureeName", event.target.value)}
                  maxLength={120}
                  autoComplete="off"
                />
              ) : null}
              <TextField
                id="wizard-hosts"
                label={text.basics.hosts}
                hint={memorial ? text.basics.hostsHintMemorial : text.basics.hostsHint}
                error={basicsErrors.hosts}
                value={basics.hosts}
                onChange={(event) => setBasic("hosts", event.target.value)}
                maxLength={160}
                autoComplete="off"
                required
              />

              <fieldset className="es-fieldset">
                <legend>{text.basics.whenLegend}</legend>
                <div className="es-when">
                  <TextField
                    id="wizard-date"
                    type="date"
                    label={text.basics.date}
                    error={basicsErrors.date}
                    value={basics.date}
                    min={today || undefined}
                    onChange={(event) => setBasic("date", event.target.value)}
                    required
                  />
                  <TextField
                    id="wizard-start"
                    type="time"
                    label={text.basics.startTime}
                    error={basicsErrors.startTime}
                    value={basics.startTime}
                    onChange={(event) => setBasic("startTime", event.target.value)}
                    required
                  />
                  <TextField
                    id="wizard-end"
                    type="time"
                    label={text.basics.endTime}
                    optional={copy.optional}
                    error={basicsErrors.endTime}
                    value={basics.endTime}
                    onChange={(event) => setBasic("endTime", event.target.value)}
                  />
                </div>
                <SelectField
                  id="wizard-zone"
                  label={text.basics.timeZone}
                  hint={text.basics.timeZoneHint}
                  error={basicsErrors.timeZone}
                  value={basics.timeZone}
                  onChange={(event) => setBasic("timeZone", event.target.value)}
                  fieldClassName="es-field-last"
                >
                  {timeZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.label}
                    </option>
                  ))}
                </SelectField>
              </fieldset>

              <fieldset className="es-fieldset">
                <legend>{text.basics.whereLegend}</legend>
                <TextField
                  id="wizard-venue"
                  label={text.basics.venueName}
                  optional={copy.optional}
                  hint={text.basics.venueHint}
                  error={basicsErrors.venueName}
                  value={basics.venueName}
                  onChange={(event) => setBasic("venueName", event.target.value)}
                  maxLength={160}
                  autoComplete="off"
                />
                <TextField
                  id="wizard-address"
                  label={text.basics.venueAddress}
                  optional={copy.optional}
                  error={basicsErrors.venueAddress}
                  value={basics.venueAddress}
                  onChange={(event) => setBasic("venueAddress", event.target.value)}
                  maxLength={300}
                  autoComplete="off"
                  fieldClassName="es-field-last"
                />
              </fieldset>
            </>
          ) : null}

          {step === "guests" ? (
            <>
              <div className="es-step-head">
                <h2 ref={headingRef} tabIndex={-1}>
                  {text.guests.heading}
                </h2>
                <p className="muted">{text.guests.lead}</p>
                <p className="muted">{text.guests.explain}</p>
              </div>
              {stepError ? (
                <Notice tone="danger" role="alert" className="es-gap">
                  {stepError}
                </Notice>
              ) : null}

              {households.length === 0 ? (
                <p className="es-empty-line">{text.guests.empty}</p>
              ) : (
                <ol className="es-rows">
                  {households.map((row, index) => (
                    <li key={row.key}>
                      <fieldset className="es-row">
                        <legend>{fill(text.guests.rowLegend, { number: index + 1 })}</legend>
                        <div className="es-row-fields">
                          <TextField
                            id={`household-${row.key}-name`}
                            label={text.guests.household}
                            hint={index === 0 ? text.guests.householdHint : undefined}
                            error={householdErrors[row.key]?.name}
                            value={row.name}
                            onChange={(event) =>
                              updateHousehold(row.key, { name: event.target.value })
                            }
                            maxLength={120}
                            autoComplete="off"
                          />
                          <TextField
                            id={`household-${row.key}-people`}
                            label={text.guests.people}
                            optional={copy.optional}
                            hint={index === 0 ? text.guests.peopleHint : undefined}
                            error={householdErrors[row.key]?.people}
                            value={row.people}
                            onChange={(event) =>
                              updateHousehold(row.key, { people: event.target.value })
                            }
                            autoComplete="off"
                          />
                        </div>
                        <button
                          type="button"
                          className="icon-button es-row-remove"
                          aria-label={fill(text.guests.remove, { number: index + 1 })}
                          onClick={() => removeHousehold(row.key)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </fieldset>
                    </li>
                  ))}
                </ol>
              )}

              <div className="es-rows-foot">
                <Button
                  id="wizard-add-household"
                  variant="secondary"
                  onClick={addHousehold}
                  disabled={households.length >= WIZARD_MAX_HOUSEHOLDS}
                >
                  <Plus className="icon" aria-hidden="true" />
                  {households.length === 0 ? text.guests.add : text.guests.addAnother}
                </Button>
                <p className="muted small es-count" role="status">
                  {totals.households > 0 ? <strong>{countLabel}</strong> : null}
                  {guestLimit !== null ? (
                    <span>{fill(text.guests.limit, { limit: guestLimit })}</span>
                  ) : null}
                </p>
              </div>
              {households.length >= WIZARD_MAX_HOUSEHOLDS ? (
                <p className="help">
                  {fill(text.guests.tooManyHouseholds, { max: WIZARD_MAX_HOUSEHOLDS })}
                </p>
              ) : null}
              {overLimit && guestLimit !== null ? (
                <Notice tone="warning" role="alert" className="es-gap-top">
                  {fill(text.guests.limitExceeded, { limit: guestLimit })}
                </Notice>
              ) : null}
            </>
          ) : null}

          {step === "review" ? (
            <>
              <div className="es-step-head">
                <h2 ref={headingRef} tabIndex={-1}>
                  {text.review.heading}
                </h2>
                <p className="muted">{text.review.lead}</p>
              </div>
              {submitError ? (
                <Notice tone="danger" role="alert" className="es-gap">
                  {submitError}
                </Notice>
              ) : null}

              <div className="es-review-preview">{preview}</div>

              <dl className="dl es-review">
                <ReviewRow
                  label={text.review.occasion}
                  value={occasion?.label ?? ""}
                  onEdit={() => goTo("template")}
                  editLabel={text.review.edit}
                  editHint={text.review.occasion}
                  disabled={pending}
                />
                <ReviewRow
                  label={text.review.template}
                  value={template?.name ?? ""}
                  onEdit={() => goTo("template")}
                  editLabel={text.review.edit}
                  editHint={text.review.template}
                  disabled={pending}
                />
                <ReviewRow
                  label={text.review.event}
                  value={basics.title.trim()}
                  onEdit={() => goTo("basics")}
                  editLabel={text.review.edit}
                  editHint={text.review.event}
                  disabled={pending}
                />
                {memorial && basics.honoureeName.trim() ? (
                  <ReviewRow label={text.review.honouree} value={basics.honoureeName.trim()} />
                ) : null}
                <ReviewRow label={text.review.hosts} value={basics.hosts.trim()} />
                <ReviewRow label={text.review.when} value={dateLine} />
                <ReviewRow
                  label={text.review.where}
                  value={
                    basics.venueName.trim()
                      ? [basics.venueName.trim(), basics.venueAddress.trim()]
                          .filter(Boolean)
                          .join(", ")
                      : text.review.noVenue
                  }
                  muted={!basics.venueName.trim()}
                />
                <ReviewRow
                  label={text.review.guests}
                  value={totals.households > 0 ? countLabel : text.review.noGuests}
                  muted={totals.households === 0}
                  onEdit={() => goTo("guests")}
                  editLabel={text.review.edit}
                  editHint={text.review.guests}
                  disabled={pending}
                />
              </dl>
              <p className="muted small es-gap-top">{text.review.after}</p>
            </>
          ) : null}

          <div className="es-wizard-actions">
            {stepIndex > 0 ? (
              <Button variant="secondary" onClick={back} disabled={pending}>
                <ArrowLeft className="icon es-flip" aria-hidden="true" />
                {text.back}
              </Button>
            ) : (
              <span />
            )}
            {step === "review" ? (
              <Button type="submit" pending={pending} pendingLabel={text.review.creating}>
                {text.review.create}
              </Button>
            ) : (
              <Button type="submit">
                {text.next}
                <ArrowRight className="icon es-flip" aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>

        <aside className="es-wizard-aside" aria-label={copy.preview.title}>
          <p className="es-aside-title">{copy.preview.title}</p>
          {preview}
          <p className="notice">{copy.preview.note}</p>
        </aside>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  muted,
  onEdit,
  editLabel,
  editHint,
  disabled,
}: {
  label: string;
  value: string;
  muted?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  editHint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={muted ? "es-review-muted" : undefined}>
        <span>{value}</span>
        {onEdit && editLabel ? (
          <button
            type="button"
            className="link es-review-edit"
            onClick={onEdit}
            disabled={disabled}
          >
            {editLabel}
            <span className="sr-only"> {editHint}</span>
          </button>
        ) : null}
      </dd>
    </div>
  );
}
