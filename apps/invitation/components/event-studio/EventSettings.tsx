"use client";

import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import type { InvitationShellCopy, InvitationStudioCopy } from "@managevent/i18n";
import type { RsvpConfig, WellConfig } from "@managevent/validators";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { ActionFailure } from "@/lib/action-result";
import {
  confirmCheckoutAction,
  deleteEventAction,
  startCheckoutAction,
  updateInvitationAction,
} from "@/lib/event-studio/actions";
import { settle } from "@/lib/client-action";
import type { FormErrors } from "@/lib/event-studio/content-form";
import { fill } from "@/lib/event-studio/local-date";
import {
  checkSlugWords,
  fromWellForm,
  normaliseSlugWords,
  readDeadline,
  splitEventSlug,
  toWellForm,
  validateWellForm,
  WELL_LIMITS,
  type WellForm,
} from "@/lib/event-studio/settings-form";
import { rowKey } from "@/lib/event-studio/wizard";

type SettingsCopy = InvitationStudioCopy["settings"];

export interface EventSettingsProps {
  eventId: string;
  eventTitle: string;
  memorial: boolean;
  /** False for a view-only co-host: everything is shown, nothing can be changed. */
  canEdit: boolean;
  isOwner: boolean;
  published: boolean;
  /** `invitation.updatedAt` as loaded. Shared by every form here as `expectedUpdatedAt`. */
  updatedAt: string;
  startsAtLocal: string;
  timeZoneLabel: string;
  deadline: { date: string; time: string };
  rsvpConfig: RsvpConfig;
  allowForwarding: boolean;
  wellMode: string;
  wellConfig: WellConfig;
  eventSlug: string;
  /** The start of every guest link, e.g. `https://invitation.managevent.com.au/i/`. */
  linkBase: string;
  canCustomiseLink: boolean;
  plan: {
    /** The name of the plan that applies, already resolved for Memorial Mode. */
    name: string;
    effectivePlan: "FREE" | "PREMIUM" | "AGENCY";
    guests: number;
    guestLimit: number | null;
    emailsSent: number;
    emailLimit: number | null;
    upgradeAvailable: boolean;
    /** "$69" and "$6.27", formatted on the server from the plan view's cents. */
    price: string;
    gst: string;
    freeGuestLimit: number | null;
  };
  capabilities: { stripeCheckout: boolean; emailInvitations: boolean };
  /** `?checkout=` on return from Stripe. */
  checkout: { status: "success" | "cancelled" | null; sessionId: string | null };
  contactUrl: string;
  copy: {
    settings: SettingsCopy;
    capabilities: InvitationShellCopy["capabilities"];
    errors: Pick<
      InvitationShellCopy["errors"],
      "STALE_WRITE" | "NETWORK_ERROR" | "SLUG_TAKEN" | "FEATURE_NOT_IN_PLAN"
    >;
    ui: Pick<InvitationShellCopy["ui"], "saving" | "cancel" | "deleting" | "optional">;
    premium: string;
  };
}

interface SaveContext {
  eventId: string;
  canEdit: boolean;
  stamp: string;
  setStamp: (value: string) => void;
  copy: EventSettingsProps["copy"];
}

/** A failed save, shown above the form's button. A stale write offers the reload. */
function SaveError({
  failure,
  copy,
}: {
  failure: ActionFailure | null;
  copy: SaveContext["copy"];
}) {
  if (!failure) return null;
  return (
    <Notice tone="danger" role="alert" className="es-gap-top">
      <p>{failure.message}</p>
      {failure.code === "STALE_WRITE" ? (
        <p>
          <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
            {copy.settings.reload}
          </Button>
        </p>
      ) : null}
    </Notice>
  );
}

function SettingsSection({
  id,
  title,
  lead,
  tone,
  children,
}: {
  id: string;
  title: string;
  lead?: string | undefined;
  tone?: "danger" | undefined;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card es-section" data-tone={tone} aria-labelledby={`${id}-title`}>
      <div className="es-section-head">
        <h2 id={`${id}-title`} className="es-section-title">
          {title}
        </h2>
        {lead ? <p className="muted">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check es-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="es-toggle-label">{label}</span>
        {hint ? (
          <span className="help" id={`${id}-hint`}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

// ─── Replies ────────────────────────────────────────────────────────────────

function ReplySettings({
  ctx,
  memorial,
  startsAtLocal,
  timeZoneLabel,
  deadline,
  rsvpConfig,
  allowForwarding,
}: {
  ctx: SaveContext;
  memorial: boolean;
  startsAtLocal: string;
  timeZoneLabel: string;
  deadline: { date: string; time: string };
  rsvpConfig: RsvpConfig;
  allowForwarding: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const text = ctx.copy.settings.rsvp;
  const initial = { deadline, config: rsvpConfig, allowForwarding };
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState(initial);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);

  const dirty = JSON.stringify(state) !== JSON.stringify(saved);
  const disabled = !ctx.canEdit || pending;
  const setConfig = (patch: Partial<RsvpConfig>) =>
    setState((current) => ({ ...current, config: { ...current.config, ...patch } }));
  const setDeadline = (patch: Partial<{ date: string; time: string }>) => {
    setDeadlineError(null);
    setState((current) => ({ ...current, deadline: { ...current.deadline, ...patch } }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || pending) return;
    const parsed = readDeadline(state.deadline.date, state.deadline.time, startsAtLocal);
    if (!parsed.ok) {
      setDeadlineError(
        parsed.error === "incomplete"
          ? text.errors.deadlineIncomplete
          : text.errors.deadlineAfterEvent,
      );
      document.getElementById("settings-deadline-date")?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    const result = await settle(
      () =>
        updateInvitationAction(ctx.eventId, {
          rsvpDeadlineLocal: parsed.value,
          // The whole config goes back: the API replaces it, it does not merge.
          rsvpConfig: state.config,
          allowForwarding: state.allowForwarding,
          expectedUpdatedAt: ctx.stamp,
        }),
      ctx.copy.errors.NETWORK_ERROR,
    );
    setPending(false);
    if (!result) return;
    if (!result.ok) return setFailure(result);
    ctx.setStamp(result.data.invitationUpdatedAt);
    setSaved(state);
    toast.show(text.saved, { tone: "success" });
    router.refresh();
  };

  const hasDeadline = state.deadline.date.length > 0 || state.deadline.time.length > 0;

  return (
    <SettingsSection id="replies" title={text.title}>
      <form onSubmit={onSubmit} noValidate>
        <fieldset className="es-fieldset">
          <legend>{text.deadlineLegend}</legend>
          <p className="help" id="settings-deadline-hint">
            {text.deadlineHint} {fill(text.deadlineZone, { timeZone: timeZoneLabel })}
          </p>
          <div className="es-deadline">
            <TextField
              id="settings-deadline-date"
              type="date"
              label={text.deadlineDate}
              value={state.deadline.date}
              max={startsAtLocal.slice(0, 10)}
              disabled={disabled}
              error={deadlineError}
              onChange={(event) =>
                setDeadline({
                  date: event.target.value,
                  // "Reply by the 1st" means by the end of that day.
                  ...(event.target.value && !state.deadline.time ? { time: "23:59" } : {}),
                })
              }
              fieldClassName="es-field-last"
            />
            <TextField
              id="settings-deadline-time"
              type="time"
              label={text.deadlineTime}
              value={state.deadline.time}
              disabled={disabled}
              onChange={(event) => setDeadline({ time: event.target.value })}
              fieldClassName="es-field-last"
            />
            {hasDeadline ? (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={() => setDeadline({ date: "", time: "" })}
              >
                {text.deadlineClear}
              </Button>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="es-fieldset">
          <legend>{text.questionsLegend}</legend>
          <p className="help">{text.questionsLead}</p>
          <Toggle
            id="rsvp-maybe"
            label={text.allowMaybe}
            checked={state.config.allowMaybe}
            disabled={disabled}
            onChange={(checked) => setConfig({ allowMaybe: checked })}
          />
          <Toggle
            id="rsvp-dietary"
            label={text.askDietary}
            hint={text.askDietaryHint}
            checked={state.config.askDietary}
            disabled={disabled}
            onChange={(checked) => setConfig({ askDietary: checked })}
          />
          <Toggle
            id="rsvp-access"
            label={text.askAccessibility}
            checked={state.config.askAccessibility}
            disabled={disabled}
            onChange={(checked) => setConfig({ askAccessibility: checked })}
          />
          <Toggle
            id="rsvp-song"
            label={memorial ? text.askSongMemorial : text.askSong}
            checked={state.config.songPrompt !== "HIDDEN"}
            disabled={disabled}
            onChange={(checked) =>
              setConfig({ songPrompt: !checked ? "HIDDEN" : memorial ? "MEMORIAL" : "STANDARD" })
            }
          />
          <Toggle
            id="rsvp-message"
            label={text.askMessage}
            checked={state.config.askMessage}
            disabled={disabled}
            onChange={(checked) => setConfig({ askMessage: checked })}
          />
          <Toggle
            id="rsvp-contact"
            label={text.askContact}
            hint={text.askContactHint}
            checked={state.config.askContact}
            disabled={disabled}
            onChange={(checked) => setConfig({ askContact: checked })}
          />
        </fieldset>

        <fieldset className="es-fieldset">
          <legend>{text.forwardingLegend}</legend>
          <Toggle
            id="rsvp-forwarding"
            label={text.allowForwarding}
            hint={text.allowForwardingHint}
            checked={state.allowForwarding}
            disabled={disabled}
            onChange={(checked) =>
              setState((current) => ({ ...current, allowForwarding: checked }))
            }
          />
        </fieldset>

        <SaveError failure={failure} copy={ctx.copy} />
        {ctx.canEdit ? (
          <div className="form-actions es-form-actions">
            <Button
              type="submit"
              disabled={!dirty}
              pending={pending}
              pendingLabel={ctx.copy.ui.saving}
            >
              {text.save}
            </Button>
          </div>
        ) : null}
      </form>
    </SettingsSection>
  );
}

// ─── Wishing well / tribute book ────────────────────────────────────────────

function WellSettings({
  ctx,
  memorial,
  wellMode,
  wellConfig,
}: {
  ctx: SaveContext;
  memorial: boolean;
  wellMode: string;
  wellConfig: WellConfig;
}) {
  const router = useRouter();
  const toast = useToast();
  const text = memorial ? ctx.copy.settings.tribute : ctx.copy.settings.well;
  const wellText = ctx.copy.settings.well;
  const tributeText = ctx.copy.settings.tribute;
  const [saved, setSaved] = useState(() => toWellForm(wellMode, wellConfig));
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const disabled = !ctx.canEdit || pending;
  const optional = ctx.copy.ui.optional;
  const set = <K extends keyof WellForm>(key: K, value: WellForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) =>
        Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)),
      );
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || pending) return;
    const found = form.enabled
      ? validateWellForm(form, memorial, ctx.copy.settings.wellErrors)
      : {};
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setPending(true);
    setFailure(null);
    // Switched off with details that no longer validate: keep what was last saved.
    const next = form.enabled ? form : { ...saved, enabled: false };
    const result = await settle(
      () =>
        updateInvitationAction(ctx.eventId, {
          ...fromWellForm(next, memorial),
          expectedUpdatedAt: ctx.stamp,
        }),
      ctx.copy.errors.NETWORK_ERROR,
    );
    setPending(false);
    if (!result) return;
    if (!result.ok) return setFailure(result);
    ctx.setStamp(result.data.invitationUpdatedAt);
    setSaved(next);
    setForm(next);
    toast.show(text.saved, { tone: "success" });
    router.refresh();
  };

  return (
    <SettingsSection id="well" title={text.title} lead={text.lead}>
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <Toggle
          id="well-enabled"
          label={text.enable}
          checked={form.enabled}
          disabled={disabled}
          onChange={(checked) => set("enabled", checked)}
        />

        {form.enabled ? (
          <div className="es-well-fields">
            {memorial ? (
              <TextField
                id="well-prompt"
                label={tributeText.prompt}
                optional={optional}
                placeholder={tributeText.promptPlaceholder}
                error={errors.tributePrompt}
                value={form.tributePrompt}
                disabled={disabled}
                maxLength={WELL_LIMITS.tributePrompt}
                onChange={(event) => set("tributePrompt", event.target.value)}
              />
            ) : null}
            <TextAreaField
              id="well-message"
              label={text.message}
              optional={optional}
              placeholder={text.messagePlaceholder}
              error={errors.message}
              value={form.message}
              disabled={disabled}
              maxLength={WELL_LIMITS.message}
              rows={3}
              className="es-textarea-short"
              onChange={(event) => set("message", event.target.value)}
            />

            {memorial ? (
              <TextField
                id="well-donation"
                type="url"
                inputMode="url"
                label={tributeText.donationUrl}
                optional={optional}
                hint={tributeText.donationHint}
                placeholder="https://"
                error={errors.donationUrl}
                value={form.donationUrl}
                disabled={disabled}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => set("donationUrl", event.target.value)}
                fieldClassName="es-field-last"
              />
            ) : (
              <fieldset className="es-fieldset">
                <legend>{wellText.bankLegend}</legend>
                <p className="help">{wellText.bankHint}</p>
                <div className="fields">
                  <TextField
                    id="well-payid"
                    label={wellText.payId}
                    optional={optional}
                    error={errors.payId}
                    value={form.payId}
                    disabled={disabled}
                    maxLength={WELL_LIMITS.payId}
                    autoComplete="off"
                    onChange={(event) => set("payId", event.target.value)}
                  />
                  <TextField
                    id="well-account-name"
                    label={wellText.accountName}
                    optional={optional}
                    error={errors.accountName}
                    value={form.accountName}
                    disabled={disabled}
                    maxLength={WELL_LIMITS.accountName}
                    autoComplete="off"
                    onChange={(event) => set("accountName", event.target.value)}
                  />
                  <TextField
                    id="well-bsb"
                    label={wellText.bsb}
                    optional={optional}
                    error={errors.bsb}
                    value={form.bsb}
                    disabled={disabled}
                    inputMode="numeric"
                    maxLength={7}
                    autoComplete="off"
                    onChange={(event) => set("bsb", event.target.value)}
                  />
                  <TextField
                    id="well-account-number"
                    label={wellText.accountNumber}
                    optional={optional}
                    error={errors.accountNumber}
                    value={form.accountNumber}
                    disabled={disabled}
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="off"
                    onChange={(event) => set("accountNumber", event.target.value)}
                  />
                  <TextField
                    id="well-registry"
                    type="url"
                    inputMode="url"
                    label={wellText.registryUrl}
                    optional={optional}
                    placeholder="https://"
                    error={errors.registryUrl}
                    value={form.registryUrl}
                    disabled={disabled}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) => set("registryUrl", event.target.value)}
                    fieldClassName="es-field-last"
                  />
                  <TextField
                    id="well-donation"
                    type="url"
                    inputMode="url"
                    label={wellText.donationUrl}
                    optional={optional}
                    placeholder="https://"
                    error={errors.donationUrl}
                    value={form.donationUrl}
                    disabled={disabled}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) => set("donationUrl", event.target.value)}
                    fieldClassName="es-field-last"
                  />
                </div>
              </fieldset>
            )}
          </div>
        ) : null}

        <SaveError failure={failure} copy={ctx.copy} />
        {ctx.canEdit ? (
          <div className="form-actions es-form-actions">
            <Button
              type="submit"
              disabled={!dirty}
              pending={pending}
              pendingLabel={ctx.copy.ui.saving}
            >
              {text.save}
            </Button>
          </div>
        ) : null}
      </form>
    </SettingsSection>
  );
}

// ─── Invitation link ────────────────────────────────────────────────────────

function LinkSettings({
  ctx,
  eventSlug,
  linkBase,
  canCustomise,
  published,
}: {
  ctx: SaveContext;
  eventSlug: string;
  linkBase: string;
  canCustomise: boolean;
  published: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const text = ctx.copy.settings.link;
  const [slug, setSlug] = useState(eventSlug);
  const { words: savedWords, suffix } = splitEventSlug(slug);
  const [words, setWords] = useState(savedWords);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [fixed, setFixed] = useState(published);

  const editable = ctx.canEdit && canCustomise && !fixed;
  const dirty = normaliseSlugWords(words) !== savedWords;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editable || !dirty || pending) return;
    const next = normaliseSlugWords(words);
    const check = checkSlugWords(next);
    if (check !== "ok") {
      setError(
        check === "required"
          ? text.errors.required
          : check === "too-long"
            ? text.errors.tooLong
            : text.errors.invalid,
      );
      document.getElementById("settings-link-words")?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    setError(null);
    const result = await settle(
      () =>
        updateInvitationAction(ctx.eventId, { eventSlugWords: next, expectedUpdatedAt: ctx.stamp }),
      ctx.copy.errors.NETWORK_ERROR,
    );
    setPending(false);
    if (!result) return;
    if (!result.ok) {
      if (result.code === "SLUG_TAKEN") {
        setError(ctx.copy.errors.SLUG_TAKEN);
        document.getElementById("settings-link-words")?.focus();
      } else if (result.code === "CONFLICT") {
        // The address was already fixed by an earlier publish.
        setFixed(true);
        setWords(savedWords);
      } else {
        setFailure(result);
      }
      return;
    }
    ctx.setStamp(result.data.invitationUpdatedAt);
    setSlug(result.data.eventSlug);
    setWords(splitEventSlug(result.data.eventSlug).words);
    toast.show(text.saved, { tone: "success" });
    router.refresh();
  };

  return (
    <SettingsSection id="link" title={text.title} lead={text.lead}>
      <p className="es-link-current">
        <span className="label">{text.current}</span>
        <bdi className="es-link-url">
          {linkBase}
          <strong>{slug}</strong>/
        </bdi>
      </p>

      {fixed ? (
        <p className="muted">{text.publishedLocked}</p>
      ) : !canCustomise ? (
        <p className="es-locked">
          <Badge>
            <Lock className="icon" aria-hidden="true" />
            {ctx.copy.premium}
          </Badge>
          <span>
            {text.premiumLocked}{" "}
            <Link className="link" href="#plan">
              {text.seePlan}
            </Link>
          </span>
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="es-link-edit">
            <TextField
              id="settings-link-words"
              label={text.words}
              hint={text.wordsHint}
              error={error}
              value={words}
              disabled={!editable || pending}
              maxLength={60}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setWords(event.target.value);
                setError(null);
              }}
              onBlur={() => setWords((current) => normaliseSlugWords(current))}
              fieldClassName="es-row-grow es-field-last"
            />
            <span className="es-link-suffix" aria-hidden="true">
              -{suffix}
            </span>
          </div>
          <SaveError failure={failure} copy={ctx.copy} />
          {ctx.canEdit ? (
            <div className="form-actions es-form-actions">
              <Button
                type="submit"
                disabled={!dirty}
                pending={pending}
                pendingLabel={ctx.copy.ui.saving}
              >
                {text.save}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </SettingsSection>
  );
}

// ─── Plan and upgrade ───────────────────────────────────────────────────────

function PlanSettings({
  ctx,
  memorial,
  plan,
  capabilities,
  checkout,
  contactUrl,
}: {
  ctx: SaveContext;
  memorial: boolean;
  plan: EventSettingsProps["plan"];
  capabilities: EventSettingsProps["capabilities"];
  checkout: EventSettingsProps["checkout"];
  contactUrl: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const text = ctx.copy.settings.plan;
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [confirm, setConfirm] = useState<"idle" | "working" | "done" | "failed">(
    checkout.status === "success" && checkout.sessionId ? "working" : "idle",
  );
  const [confirmFailure, setConfirmFailure] = useState<ActionFailure | null>(null);
  const checkoutKey = useRef<string | null>(null);
  const confirmStarted = useRef(false);

  const runConfirm = async () => {
    if (!checkout.sessionId) return;
    setConfirm("working");
    setConfirmFailure(null);
    const sessionId = checkout.sessionId;
    const result = await settle(
      () => confirmCheckoutAction(ctx.eventId, sessionId),
      ctx.copy.errors.NETWORK_ERROR,
    );
    if (!result) return;
    if (result.ok) {
      setConfirm("done");
      // The upgrade wrote the invitation: later saves on this page must carry its new stamp.
      ctx.setStamp(result.data.invitationUpdatedAt);
      // Drop the session id from the address so a reload does not confirm again.
      router.replace(`${pathname}?checkout=done#plan`, { scroll: false });
      router.refresh();
    } else {
      setConfirm("failed");
      setConfirmFailure(result);
    }
  };

  useEffect(() => {
    if (confirmStarted.current) return;
    if (checkout.status !== "success" || !checkout.sessionId) return;
    confirmStarted.current = true;
    void runConfirm();
    // Runs once, for the session id this page was opened with.
  }, []);

  const startCheckout = async () => {
    if (starting) return;
    setStarting(true);
    setFailure(null);
    checkoutKey.current ??= rowKey();
    const key = checkoutKey.current;
    const result = await settle(
      () => startCheckoutAction(ctx.eventId, key),
      ctx.copy.errors.NETWORK_ERROR,
    );
    if (!result) return;
    if (result.ok) {
      // Leave for Stripe's hosted checkout; the button stays busy until the page unloads.
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setStarting(false);
    setFailure(result);
  };

  const isFree = plan.effectivePlan === "FREE";
  const features = [
    text.features.householdLinks,
    plan.freeGuestLimit !== null
      ? fill(text.features.guests, { limit: plan.freeGuestLimit })
      : null,
    text.features.design,
    text.features.passes,
    text.features.link,
    capabilities.emailInvitations ? text.features.reminders : text.features.remindersOff,
    text.features.branding,
  ].filter((item): item is string => item !== null);

  return (
    <SettingsSection id="plan" title={text.title}>
      {confirm === "working" ? (
        <Notice role="status" className="es-gap">
          <p className="es-inline">
            <Spinner /> {text.confirming}
          </p>
        </Notice>
      ) : null}
      {confirm === "done" ? (
        <Notice tone="success" role="status" title={text.successTitle} className="es-gap">
          {text.success}
        </Notice>
      ) : null}
      {confirm === "failed" && confirmFailure ? (
        <Notice tone="danger" role="alert" title={text.confirmFailedTitle} className="es-gap">
          <p>{confirmFailure.message}</p>
          <p>
            <Button variant="secondary" size="small" onClick={() => void runConfirm()}>
              {text.confirmRetry}
            </Button>
          </p>
        </Notice>
      ) : null}
      {checkout.status === "cancelled" ? (
        <Notice role="status" className="es-gap">
          {text.cancelled}
        </Notice>
      ) : null}

      <dl className="dl es-dl es-plan-dl">
        <div>
          <dt>{text.current}</dt>
          <dd>{plan.name}</dd>
        </div>
        <div>
          <dt>{text.guests}</dt>
          <dd className="num">
            {plan.guestLimit === null
              ? fill(text.guestsUnlimited, { count: plan.guests })
              : fill(text.guestsUsed, { count: plan.guests, limit: plan.guestLimit })}
          </dd>
        </div>
        {capabilities.emailInvitations ? (
          <div>
            <dt>{text.emails}</dt>
            <dd className="num">
              {plan.emailLimit === null
                ? fill(text.emailsUnlimited, { count: plan.emailsSent })
                : fill(text.emailsUsed, { count: plan.emailsSent, limit: plan.emailLimit })}
            </dd>
          </div>
        ) : null}
      </dl>

      {memorial ? (
        <p className="muted es-gap-top">{text.memorial}</p>
      ) : plan.effectivePlan === "AGENCY" ? (
        <p className="muted es-gap-top">{text.agency}</p>
      ) : !isFree ? (
        <p className="muted es-gap-top">{text.alreadyPremium}</p>
      ) : (
        <div className="es-pass">
          <div className="es-pass-head">
            <h3 className="es-pass-title">{text.passTitle}</h3>
            <p className="es-pass-price">{fill(text.price, { price: plan.price })}</p>
          </div>
          <p className="sr-only" id="pass-features">
            {text.featuresLabel}
          </p>
          <ul className="es-pass-features" aria-labelledby="pass-features">
            {features.map((feature) => (
              <li key={feature}>
                <Check className="icon" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          {capabilities.stripeCheckout && plan.upgradeAvailable ? (
            ctx.canEdit ? (
              <>
                {failure ? (
                  <Notice tone="danger" role="alert" className="es-gap">
                    {failure.message}
                  </Notice>
                ) : null}
                <Button onClick={startCheckout} pending={starting} pendingLabel={text.upgrading}>
                  {fill(text.upgrade, { price: plan.price })}
                </Button>
                <p className="notice es-gap-top">
                  {text.checkoutNote} {fill(text.gst, { gst: plan.gst })}
                </p>
              </>
            ) : null
          ) : (
            <Notice>
              <p>{ctx.copy.capabilities.stripeCheckoutOff}</p>
              <p>
                <a className="link" href={contactUrl} rel="noopener">
                  {ctx.copy.capabilities.contactUs}
                </a>
              </p>
            </Notice>
          )}
        </div>
      )}
    </SettingsSection>
  );
}

// ─── Delete ─────────────────────────────────────────────────────────────────

function DangerZone({
  ctx,
  eventTitle,
  isOwner,
}: {
  ctx: SaveContext;
  eventTitle: string;
  isOwner: boolean;
}) {
  const text = ctx.copy.settings.danger;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  const matches = typed.trim().toLowerCase() === eventTitle.trim().toLowerCase();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setMismatch(false);
    setFailure(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!matches) {
      setMismatch(true);
      document.getElementById("settings-delete-confirm")?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    const result = await settle(
      () => deleteEventAction(ctx.eventId),
      ctx.copy.errors.NETWORK_ERROR,
    );
    // A successful delete redirects to the event list and never returns a result.
    if (!result || result.ok) return;
    setPending(false);
    setFailure(result);
  };

  return (
    <SettingsSection id="delete" title={text.title} lead={text.body} tone="danger">
      {isOwner ? (
        <Button variant="danger" onClick={() => setOpen(true)}>
          {text.button}
        </Button>
      ) : (
        <p className="muted">{text.ownerOnly}</p>
      )}

      <Modal
        open={open}
        onClose={close}
        title={text.dialogTitle}
        description={fill(text.dialogBody, { title: eventTitle })}
        dismissible={!pending}
      >
        <form onSubmit={onSubmit} noValidate>
          <TextField
            id="settings-delete-confirm"
            label={text.typeLabel}
            hint={fill(text.typeHint, { title: eventTitle })}
            error={mismatch && !matches ? text.mismatch : null}
            value={typed}
            disabled={pending}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => {
              setTyped(event.target.value);
              setMismatch(false);
            }}
          />
          {failure ? (
            <Notice tone="danger" role="alert">
              {failure.message}
            </Notice>
          ) : null}
          <div className="dialog-footer">
            <Button variant="secondary" onClick={close} disabled={pending}>
              {ctx.copy.ui.cancel}
            </Button>
            <Button
              type="submit"
              variant="danger"
              pending={pending}
              pendingLabel={ctx.copy.ui.deleting}
            >
              {text.confirm}
            </Button>
          </div>
        </form>
      </Modal>
    </SettingsSection>
  );
}

/**
 * The Settings tab: replies, the wishing well or tribute book, the invitation link, the plan
 * and deleting the event. Each section saves by itself.
 *
 * Every save carries the same `expectedUpdatedAt` stamp, held here and moved on after each
 * successful save, so saving one section never makes the next one look stale.
 */
export function EventSettings(props: EventSettingsProps) {
  const [stamp, setStamp] = useState(props.updatedAt);
  const ctx: SaveContext = {
    eventId: props.eventId,
    canEdit: props.canEdit,
    stamp,
    setStamp,
    copy: props.copy,
  };

  const text = props.copy.settings;
  const sections = [
    { id: "replies", label: text.rsvp.title },
    { id: "well", label: props.memorial ? text.tribute.title : text.well.title },
    { id: "link", label: text.link.title },
    { id: "plan", label: text.plan.title },
    { id: "delete", label: text.danger.title },
  ];

  return (
    <div className="app-layout es-settings-layout">
      <nav className="side-nav es-settings-nav" aria-label={text.navLabel}>
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>
      <div className="es-settings">
        <ReplySettings
          ctx={ctx}
          memorial={props.memorial}
          startsAtLocal={props.startsAtLocal}
          timeZoneLabel={props.timeZoneLabel}
          deadline={props.deadline}
          rsvpConfig={props.rsvpConfig}
          allowForwarding={props.allowForwarding}
        />
        <WellSettings
          ctx={ctx}
          memorial={props.memorial}
          wellMode={props.wellMode}
          wellConfig={props.wellConfig}
        />
        <LinkSettings
          ctx={ctx}
          eventSlug={props.eventSlug}
          linkBase={props.linkBase}
          canCustomise={props.canCustomiseLink}
          published={props.published}
        />
        <PlanSettings
          ctx={ctx}
          memorial={props.memorial}
          plan={props.plan}
          capabilities={props.capabilities}
          checkout={props.checkout}
          contactUrl={props.contactUrl}
        />
        <DangerZone ctx={ctx} eventTitle={props.eventTitle} isOwner={props.isOwner} />
      </div>
    </div>
  );
}
