"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { LeadStage } from "@managevent/types";
import {
  assignLead,
  type LeadFormState,
  saveLeadNotes,
  updateLeadStage,
} from "../app/admin/actions";
import { actionErrorMessage } from "../lib/admin/action-result";

/** Failure messages by error code, plus the fallback (`AdminPagesCopy["errors"]`). */
type ErrorMessages = Readonly<Record<string, string>> & { readonly fallback: string };

/**
 * The outcome line under a form: a polite status when saved, an alert when it failed.
 *
 * It takes focus when it appears. The button that was pressed is disabled while saving and may
 * be gone afterwards (a stage move replaces the buttons), so without this a keyboard user would
 * be dropped back at the top of the page.
 */
function FormOutcome({
  state,
  saved,
  errors,
  id,
}: {
  state: LeadFormState;
  saved: string;
  errors: ErrorMessages;
  id: string;
}) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (state) ref.current?.focus();
  }, [state]);
  if (!state) return null;
  return state.ok ? (
    <p className="console-form-status" role="status" id={id} ref={ref} tabIndex={-1}>
      {saved}
    </p>
  ) : (
    <p className="console-form-status error" role="alert" id={id} ref={ref} tabIndex={-1}>
      {actionErrorMessage(errors, state.code)}
    </p>
  );
}

/** One button per stage the enquiry can move to from where it is now. */
export function LeadStageForm({
  leadId,
  stage,
  moves,
  copy,
  errors,
}: {
  leadId: string;
  stage: LeadStage;
  moves: readonly { stage: LeadStage; label: string }[];
  copy: { saved: string; saving: string };
  errors: ErrorMessages;
}) {
  const [state, action, pending] = useActionState(updateLeadStage, null);
  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="from" value={stage} />
      <div className="console-actions">
        {moves.map((move, index) => (
          <button
            key={move.stage}
            type="submit"
            name="stage"
            value={move.stage}
            disabled={pending}
            className={
              move.stage === "LOST"
                ? "button button-small button-danger"
                : index === 0
                  ? "button button-small"
                  : "button button-small button-secondary"
            }
          >
            {move.label}
          </button>
        ))}
      </div>
      {pending ? (
        <p className="console-form-status muted" role="status">
          {copy.saving}
        </p>
      ) : (
        <FormOutcome state={state} saved={copy.saved} errors={errors} id="lead-stage-outcome" />
      )}
    </form>
  );
}

/** Internal notes. The box is controlled so a failed save never loses what was typed. */
export function LeadNotesForm({
  leadId,
  notes,
  maxLength,
  copy,
  errors,
}: {
  leadId: string;
  notes: string;
  maxLength: number;
  copy: { label: string; help: string; save: string; saved: string; saving: string };
  errors: ErrorMessages;
}) {
  const [state, action, pending] = useActionState(saveLeadNotes, null);
  const [value, setValue] = useState(notes);
  const failed = state !== null && !state.ok;
  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="leadId" value={leadId} />
      <div className="field">
        <label htmlFor="lead-notes">{copy.label}</label>
        <textarea
          id="lead-notes"
          name="notes"
          rows={6}
          maxLength={maxLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? "lead-notes-help lead-notes-outcome" : "lead-notes-help"}
        />
        <div className="console-notes-meta">
          <p className="help" id="lead-notes-help">
            {copy.help}
          </p>
          <p className="help num" aria-hidden="true">
            {value.length}/{maxLength}
          </p>
        </div>
      </div>
      <div className="form-actions">
        <button
          type="submit"
          className="button button-small"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? copy.saving : copy.save}
        </button>
      </div>
      {pending ? null : (
        <FormOutcome state={state} saved={copy.saved} errors={errors} id="lead-notes-outcome" />
      )}
    </form>
  );
}

/** "Assign to me" or "Remove assignment". The assignee is decided on the server. */
export function LeadAssignForm({
  leadId,
  assignedToMe,
  assigned,
  copy,
  errors,
}: {
  leadId: string;
  assignedToMe: boolean;
  assigned: boolean;
  copy: { assignToMe: string; unassign: string; saved: string; saving: string };
  errors: ErrorMessages;
}) {
  const [state, action, pending] = useActionState(assignLead, null);
  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="leadId" value={leadId} />
      <div className="console-actions">
        {assignedToMe ? null : (
          <button
            type="submit"
            name="intent"
            value="assign"
            className="button button-small"
            disabled={pending}
          >
            {copy.assignToMe}
          </button>
        )}
        {assigned ? (
          <button
            type="submit"
            name="intent"
            value="unassign"
            className="button button-small button-secondary"
            disabled={pending}
          >
            {copy.unassign}
          </button>
        ) : null}
      </div>
      {pending ? (
        <p className="console-form-status muted" role="status">
          {copy.saving}
        </p>
      ) : (
        <FormOutcome state={state} saved={copy.saved} errors={errors} id="lead-assign-outcome" />
      )}
    </form>
  );
}
