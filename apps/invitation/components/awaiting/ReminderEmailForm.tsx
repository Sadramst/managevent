"use client";

import { Send } from "lucide-react";
import { useId, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { EmailCampaignResult } from "@managevent/validators";
import { sendRsvpRemindersAction } from "@/app/studio/[eventId]/awaiting/actions";
import { Button, Notice, useSettle } from "@/components/ui";
import { fill, fillCount } from "@/lib/guest-list/fill";
import { newUuid } from "@/lib/guest-list/uuid";

export interface ReminderEmailFormProps {
  eventId: string;
  /** The event's IANA time zone, named in the quiet-hours explanation. */
  timeZone: string;
  copy: InvitationStudioGuestsCopy["awaiting"]["email"];
}

type Failure = { title?: string; message: string; tone: "warning" | "danger" };

/**
 * "Send reminder emails": a consent tick and one button. Rendered only when the plan includes
 * reminders, email is set up and the invitation is published. Quiet hours and closed replies
 * are explained in plain words when the API refuses for those reasons.
 */
export function ReminderEmailForm({ eventId, timeZone, copy }: ReminderEmailFormProps) {
  const consentId = useId();
  const run = useSettle();
  const [pending, startTransition] = useTransition();
  const [consent, setConsent] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<EmailCampaignResult | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newUuid);

  const submit = () => {
    setFailure(null);
    if (!consent) {
      setFailure({ message: copy.consentRequired, tone: "danger" });
      return;
    }
    startTransition(async () => {
      // The key is kept on a dropped connection, so a second press is the same campaign.
      const response = await run(() => sendRsvpRemindersAction(eventId, true, idempotencyKey));
      if (!response) return;
      if (response.ok) {
        setResult(response.data);
        setConsent(false);
        setIdempotencyKey(newUuid());
        return;
      }
      if (response.code === "QUIET_HOURS") {
        setFailure({
          title: copy.quietTitle,
          message: fill(copy.quiet, { timeZone: timeZone.replace(/_/g, " ") }),
          tone: "warning",
        });
      } else if (response.code === "RSVP_CLOSED") {
        setFailure({ title: copy.closedTitle, message: copy.closed, tone: "warning" });
      } else if (response.code === "NOT_PUBLISHED") {
        setFailure({ message: copy.notPublished, tone: "warning" });
      } else {
        setFailure({ message: response.message, tone: "danger" });
      }
    });
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {result ? (
        <Notice tone={result.queued > 0 ? "success" : "info"} role="status">
          {result.queued === 0
            ? copy.resultNone
            : fillCount(result.queued, copy.resultOne, copy.result, { queued: result.queued })}
        </Notice>
      ) : null}
      <label className="check" htmlFor={consentId}>
        <input
          id={consentId}
          type="checkbox"
          checked={consent}
          disabled={pending}
          aria-required="true"
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{copy.consent}</span>
      </label>
      {failure ? (
        <Notice tone={failure.tone} role="alert" title={failure.title}>
          {failure.message}
        </Notice>
      ) : null}
      <div className="form-actions">
        <Button type="submit" pending={pending} pendingLabel={copy.sending}>
          <Send className="icon" aria-hidden="true" />
          {copy.send}
        </Button>
      </div>
    </form>
  );
}
