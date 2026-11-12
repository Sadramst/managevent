"use client";

import type { InvitationGuestCopy, InvitationGuestVoice } from "@managevent/i18n";
import type { GuestPartyView, GuestRsvpView, RsvpConfig } from "@managevent/validators";
import { Plus, X } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { type RsvpActionData, submitRsvpAction } from "@/lib/guest/actions";
import type { GuestLink } from "@/lib/guest/paths";
import { HealthFields } from "./HealthFields";
import {
  type AttendChoice,
  buildSubmission,
  carriesHealth,
  emptyHealth,
  failureFor,
  fieldId,
  hasContact,
  initialDraft,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SONG_LENGTH,
  MAX_SONGS,
  type MemberDraft,
  newIdempotencyKey,
  type PlusOneDraft,
  type RsvpDraft,
  type RsvpFieldError,
  rulesFor,
  showsHealth,
  validateDraft,
} from "./model";

export interface RsvpFormProps {
  link: GuestLink;
  party: GuestPartyView;
  rsvp: GuestRsvpView;
  config: RsvpConfig;
  /** Sample and preview invitations can be tried, but nothing is sent. */
  readOnly: "demo" | "preview" | null;
  /** True when the guest is changing a reply they already sent. */
  isUpdate: boolean;
  privacyHref: string;
  voice: InvitationGuestVoice;
  copy: InvitationGuestCopy["rsvp"];
  optionalLabel: string;
  onSubmitted: (data: RsvpActionData) => void;
  onCancel?: (() => void) | undefined;
}

/** How many characters from the limit the counter starts to show. */
const COUNTER_FROM = 200;

/**
 * The reply form, drawn from the host's settings (`rsvpConfig`): an answer for each person, then
 * only the questions the host asks.
 *
 * It never loses what was typed: answers live in component state, a failed send leaves them in
 * place with the reason, and a retry of the same answers reuses the same `Idempotency-Key` so a
 * reply that did arrive is not applied twice. Changed answers and replies after a success get a
 * new key.
 */
export function RsvpForm({
  link,
  party,
  rsvp,
  config,
  readOnly,
  isUpdate,
  privacyHref,
  voice,
  copy,
  optionalLabel,
  onSubmitted,
  onCancel,
}: RsvpFormProps) {
  const rules = useMemo(() => rulesFor(config, party, rsvp), [config, party, rsvp]);
  const [draft, setDraft] = useState<RsvpDraft>(() => initialDraft(party, rsvp, rules));
  const [reported, setReported] = useState<RsvpFieldError[]>([]);
  /** Why the last send failed. `reload` offers a reload when only a fresh page can fix it. */
  const [failure, setFailure] = useState<{ message: string; reload: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const plusOneSeq = useRef(0);
  const summary = useRef<HTMLDivElement>(null);

  // A message stays only while its problem does: fixing a field clears its error at once,
  // and nothing new is flagged until the next attempt to send.
  const errors = useMemo(() => {
    if (reported.length === 0) return reported;
    const current = validateDraft(draft, rules, copy.errors);
    return current.filter((error) => reported.some((item) => item.field === error.field));
  }, [reported, draft, rules, copy.errors]);
  const errorFor = (field: string) => errors.find((error) => error.field === field)?.message;
  const needsHealthConsent = carriesHealth(draft, rules);
  const contactEntered = hasContact(draft, rules);
  const canAddPlusOne = draft.plusOnes.length < rules.plusOneLimit;

  const update = (patch: Partial<RsvpDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateMember = (guestId: string, patch: Partial<MemberDraft>) =>
    setDraft((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.guestId === guestId ? { ...member, ...patch } : member,
      ),
    }));
  const updatePlusOne = (key: string, patch: Partial<PlusOneDraft>) =>
    setDraft((current) => ({
      ...current,
      plusOnes: current.plusOnes.map((plusOne) =>
        plusOne.key === key ? { ...plusOne, ...patch } : plusOne,
      ),
    }));

  const addPlusOne = () => {
    plusOneSeq.current += 1;
    const key = `plus-${plusOneSeq.current}`;
    setDraft((current) => ({
      ...current,
      plusOnes: [...current.plusOnes, { key, name: "", isChild: false, health: emptyHealth() }],
    }));
    // Focus the new name field once it is on the page.
    requestAnimationFrame(() => document.getElementById(fieldId.plusOneName(key))?.focus());
  };

  const choices: AttendChoice[] = rules.allowMaybe ? ["YES", "NO", "MAYBE"] : ["YES", "NO"];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || readOnly) return;
    setFailure(null);

    const problems = validateDraft(draft, rules, copy.errors);
    setReported(problems);
    if (problems.length > 0) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }

    const input = buildSubmission(draft, rules, copy.healthConsent.text);
    const body = JSON.stringify(input);
    if (!attempt.current || attempt.current.body !== body) {
      attempt.current = { key: newIdempotencyKey(), body };
    }

    setPending(true);
    try {
      const result = await submitRsvpAction(
        link.eventSlug,
        link.guestToken,
        input,
        attempt.current.key,
      );
      if (result.ok) {
        attempt.current = null;
        onSubmitted(result.data);
        return;
      }
      if (result.code === "CONFLICT") attempt.current = null;
      setFailure(failureFor(result.code, result.fieldErrors, result.message, copy.errors));
    } catch {
      // The request never completed (no signal, or the page was replaced). Answers stay put.
      setFailure({ message: copy.errors.generic, reload: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="inv-form inv-js-only"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending || undefined}
    >
      {readOnly ? (
        <Notice tone="info">
          {readOnly === "demo" ? copy.readOnlyDemo : copy.readOnlyPreview}
        </Notice>
      ) : null}

      {errors.length > 0 ? (
        <div ref={summary} tabIndex={-1} className="alert alert-danger error-summary" role="alert">
          <strong className="alert-title">{copy.errors.summaryTitle}</strong>
          <ul className="inv-error-list">
            {errors.map((error) => (
              <li key={error.field}>
                <a className="link" href={`#${error.field}`}>
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="inv-people">
        {draft.members.map((member) => {
          const statusId = fieldId.memberStatus(member.guestId);
          const statusError = errorFor(statusId);
          const question = copy.memberLegend.replace("{name}", member.name);
          return (
            <section key={member.guestId} className="inv-person" aria-label={member.name}>
              <h3 className="inv-person-name">
                {member.name}
                {member.isChild ? <span className="pill">{copy.child}</span> : null}
                {member.isPlusOne ? <span className="pill">{copy.addedGuest}</span> : null}
              </h3>

              <div
                id={statusId}
                tabIndex={-1}
                className="inv-choice"
                role="radiogroup"
                aria-label={question}
                aria-required="true"
                aria-invalid={statusError ? true : undefined}
                aria-describedby={statusError ? `${statusId}-error` : undefined}
              >
                {choices.map((choice) => (
                  <label
                    key={choice}
                    className="inv-choice-option"
                    data-checked={member.status === choice}
                    data-choice={choice}
                  >
                    <input
                      type="radio"
                      name={`attending-${member.guestId}`}
                      value={choice}
                      checked={member.status === choice}
                      onChange={() => updateMember(member.guestId, { status: choice })}
                    />
                    <span>{voice.attending[choice]}</span>
                  </label>
                ))}
              </div>
              {statusError ? (
                <p className="error" id={`${statusId}-error`}>
                  {statusError}
                </p>
              ) : null}

              {showsHealth(member, rules) ? (
                member.healthOnFile && !member.editHealth ? (
                  <div className="inv-onfile">
                    <p>{copy.healthOnFile.replace("{name}", member.name)}</p>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => updateMember(member.guestId, { editHealth: true })}
                    >
                      {copy.healthUpdate}
                    </Button>
                  </div>
                ) : (
                  <>
                    {member.healthOnFile ? (
                      <div className="inv-onfile">
                        <p>{copy.healthReplaceNote.replace("{name}", member.name)}</p>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() =>
                            updateMember(member.guestId, {
                              editHealth: false,
                              health: emptyHealth(),
                            })
                          }
                        >
                          {copy.healthKeep}
                        </Button>
                      </div>
                    ) : null}
                    <HealthFields
                      idPrefix={`rsvp-${member.guestId}`}
                      name={member.name}
                      health={member.health}
                      rules={rules}
                      severityId={fieldId.memberSeverity(member.guestId)}
                      severityError={errorFor(fieldId.memberSeverity(member.guestId))}
                      optionalLabel={optionalLabel}
                      copy={copy}
                      onChange={(health) => updateMember(member.guestId, { health })}
                    />
                  </>
                )
              ) : null}
            </section>
          );
        })}
      </div>

      {rules.plusOneLimit > 0 ? (
        <section className="inv-form-block" aria-labelledby="rsvp-plus-title">
          <h3 id="rsvp-plus-title">{copy.plusOnes.title}</h3>
          <p className="muted">
            {rules.plusOneLimit === 1
              ? copy.plusOnes.leadOne
              : copy.plusOnes.lead.replace("{count}", String(rules.plusOneLimit))}
          </p>

          {draft.plusOnes.map((plusOne, index) => {
            const label = copy.plusOnes.legend.replace("{index}", String(index + 1));
            return (
              <fieldset key={plusOne.key} className="inv-person inv-plus">
                <legend className="sr-only">{label}</legend>
                <div className="inv-plus-head">
                  <TextField
                    id={fieldId.plusOneName(plusOne.key)}
                    label={copy.plusOnes.nameLabel}
                    error={errorFor(fieldId.plusOneName(plusOne.key))}
                    value={plusOne.name}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    onChange={(event) => updatePlusOne(plusOne.key, { name: event.target.value })}
                    fieldClassName="inv-plus-name"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      plusOne.name.trim()
                        ? copy.plusOnes.removeNamed.replace("{name}", plusOne.name.trim())
                        : `${copy.plusOnes.remove}: ${label}`
                    }
                    onClick={() =>
                      update({
                        plusOnes: draft.plusOnes.filter((item) => item.key !== plusOne.key),
                      })
                    }
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
                {rules.childrenAllowed ? (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={plusOne.isChild}
                      onChange={(event) =>
                        updatePlusOne(plusOne.key, { isChild: event.target.checked })
                      }
                    />
                    <span>{copy.plusOnes.childLabel}</span>
                  </label>
                ) : null}
                <HealthFields
                  idPrefix={`rsvp-${plusOne.key}`}
                  name={plusOne.name.trim() || label}
                  health={plusOne.health}
                  rules={rules}
                  severityId={fieldId.plusOneSeverity(plusOne.key)}
                  severityError={errorFor(fieldId.plusOneSeverity(plusOne.key))}
                  optionalLabel={optionalLabel}
                  copy={copy}
                  onChange={(health) => updatePlusOne(plusOne.key, { health })}
                />
              </fieldset>
            );
          })}

          {canAddPlusOne ? (
            <Button variant="secondary" onClick={addPlusOne}>
              <Plus className="icon" aria-hidden="true" />
              {copy.plusOnes.add}
            </Button>
          ) : (
            <p className="small muted">{copy.plusOnes.full}</p>
          )}
        </section>
      ) : null}

      {rules.askSongs ? (
        <fieldset className="inv-form-block inv-songs">
          <legend>
            {voice.songLabel} <span className="label-optional">({optionalLabel})</span>
          </legend>
          <p className="help">{voice.songHint}</p>
          {draft.songs.map((song, index) => {
            const number = String(index + 1);
            return (
              <div key={index} className="field-row inv-song">
                <input
                  type="text"
                  aria-label={copy.songs.inputLabel.replace("{index}", number)}
                  placeholder={copy.songs.placeholder}
                  value={song}
                  maxLength={MAX_SONG_LENGTH}
                  autoComplete="off"
                  onChange={(event) =>
                    update({
                      songs: draft.songs.map((item, at) =>
                        at === index ? event.target.value : item,
                      ),
                    })
                  }
                />
                {draft.songs.length > 1 ? (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={copy.songs.remove.replace("{index}", number)}
                    onClick={() => update({ songs: draft.songs.filter((_, at) => at !== index) })}
                  >
                    <X aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
          {draft.songs.length < MAX_SONGS ? (
            <Button
              variant="ghost"
              size="small"
              onClick={() => update({ songs: [...draft.songs, ""] })}
            >
              <Plus className="icon" aria-hidden="true" />
              {copy.songs.add}
            </Button>
          ) : null}
        </fieldset>
      ) : null}

      {rules.askMessage ? (
        <div className="inv-form-block">
          <TextAreaField
            id="rsvp-message"
            label={voice.messageLabel}
            hint={copy.message.hint}
            optional={optionalLabel}
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft.message}
            onChange={(event) => update({ message: event.target.value })}
          />
          {draft.message.length >= MAX_MESSAGE_LENGTH - COUNTER_FROM ? (
            <p className="help num" aria-live="polite">
              {copy.message.remaining.replace(
                "{count}",
                String(MAX_MESSAGE_LENGTH - draft.message.length),
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      {rules.askContact ? (
        <fieldset className="inv-form-block">
          <legend>
            {copy.contact.title} <span className="label-optional">({optionalLabel})</span>
          </legend>
          <p className="help">{copy.contact.lead}</p>
          <div className="fields">
            <TextField
              id={fieldId.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              label={copy.contact.emailLabel}
              error={errorFor(fieldId.email)}
              value={draft.email}
              onChange={(event) => update({ email: event.target.value })}
            />
            <TextField
              id={fieldId.phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              label={copy.contact.phoneLabel}
              hint={copy.contact.phoneHint}
              error={errorFor(fieldId.phone)}
              value={draft.phone}
              onChange={(event) => update({ phone: event.target.value })}
            />
          </div>
          {contactEntered ? (
            <div className="inv-consent">
              <label className="check">
                <input
                  id={fieldId.contactConsent}
                  type="checkbox"
                  checked={draft.contactConsent}
                  aria-invalid={errorFor(fieldId.contactConsent) ? true : undefined}
                  aria-describedby={
                    errorFor(fieldId.contactConsent) ? `${fieldId.contactConsent}-error` : undefined
                  }
                  onChange={(event) => update({ contactConsent: event.target.checked })}
                />
                <span>{copy.contact.consent}</span>
              </label>
              {errorFor(fieldId.contactConsent) ? (
                <p className="error" id={`${fieldId.contactConsent}-error`}>
                  {errorFor(fieldId.contactConsent)}
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {needsHealthConsent ? (
        <div className="inv-consent inv-consent-health">
          <h3>{copy.healthConsent.title}</h3>
          <label className="check">
            <input
              id={fieldId.healthConsent}
              type="checkbox"
              checked={draft.healthConsent}
              aria-invalid={errorFor(fieldId.healthConsent) ? true : undefined}
              aria-describedby={`${fieldId.healthConsent}-note${
                errorFor(fieldId.healthConsent) ? ` ${fieldId.healthConsent}-error` : ""
              }`}
              onChange={(event) => update({ healthConsent: event.target.checked })}
            />
            <span>{copy.healthConsent.text}</span>
          </label>
          {errorFor(fieldId.healthConsent) ? (
            <p className="error" id={`${fieldId.healthConsent}-error`}>
              {errorFor(fieldId.healthConsent)}
            </p>
          ) : null}
          <p className="small muted" id={`${fieldId.healthConsent}-note`}>
            {copy.healthConsent.note}{" "}
            <a className="link" href={privacyHref} rel="noopener">
              {copy.healthConsent.privacyLink}
            </a>
          </p>
        </div>
      ) : null}

      {failure ? (
        <Notice tone="danger" role="alert">
          <p>{failure.message}</p>
          {failure.reload ? (
            <p>
              <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
                {copy.errors.reload}
              </Button>
            </p>
          ) : null}
        </Notice>
      ) : null}

      <div className="form-actions inv-form-actions">
        <Button
          type="submit"
          size="large"
          pending={pending}
          pendingLabel={voice.submitting}
          disabled={readOnly !== null}
        >
          {isUpdate ? voice.submitUpdate : voice.submit}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {copy.summary.cancelChange}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
