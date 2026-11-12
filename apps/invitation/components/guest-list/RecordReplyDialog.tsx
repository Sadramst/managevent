"use client";

import { useId, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { setRsvpAction } from "@/app/studio/[eventId]/guests/actions";
import { Button, Modal, Notice, useSettle, useToast, useUiCopy } from "@/components/ui";
import { fill } from "@/lib/guest-list/fill";
import type { LinkGuestView, RsvpStatus } from "@/lib/guest-list/view";
import type { StatusLabels } from "./StatusBadge";

export interface RecordReplyDialogProps {
  eventId: string;
  /** The household to answer for, or null when the dialog is closed. */
  party: { id: string; displayName: string; guests: LinkGuestView[] } | null;
  /** Whether this invitation offers "Maybe" (`rsvpConfig.allowMaybe`). */
  allowMaybe: boolean;
  statusLabels: StatusLabels;
  copy: InvitationStudioGuestsCopy["guests"]["reply"];
  childLabel: string;
  onClose: () => void;
}

/**
 * Records a reply the host received by phone or in person: one answer per person in the
 * household. Health information is never entered here; guests give it through their own link.
 */
export function RecordReplyDialog(props: RecordReplyDialogProps) {
  // Keyed by household so the answers start from that household's current replies each time.
  return <ReplyDialog key={props.party?.id ?? "closed"} {...props} />;
}

function ReplyDialog({
  eventId,
  party,
  allowMaybe,
  statusLabels,
  copy,
  childLabel,
  onClose,
}: RecordReplyDialogProps) {
  const { ui } = useUiCopy();
  const toast = useToast();
  const run = useSettle();
  const groupId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, RsvpStatus>>(() =>
    Object.fromEntries((party?.guests ?? []).map((guest) => [guest.id, guest.status])),
  );

  const options: RsvpStatus[] = allowMaybe
    ? ["YES", "NO", "MAYBE", "PENDING"]
    : ["YES", "NO", "PENDING"];

  const submit = () => {
    if (!party) return;
    setError(null);
    startTransition(async () => {
      const result = await run(() =>
        setRsvpAction(eventId, party.id, {
          members: party.guests.map((guest) => ({
            guestId: guest.id,
            status: answers[guest.id] ?? guest.status,
          })),
        }),
      );
      if (!result) return;
      if (result.ok) {
        toast.show(fill(copy.saved, { name: party.displayName }), { tone: "success" });
        onClose();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Modal
      open={party !== null}
      onClose={onClose}
      title={copy.title}
      description={copy.lead}
      dismissible={!pending}
    >
      {party ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="sb-reply-list">
            {party.guests.map((guest) => {
              const selected = answers[guest.id] ?? guest.status;
              // A guest who already said "maybe" keeps that choice visible even if it is now off.
              const guestOptions: RsvpStatus[] =
                selected === "MAYBE" && !allowMaybe ? ["YES", "NO", "MAYBE", "PENDING"] : options;
              return (
                <fieldset key={guest.id} className="sb-choice-field">
                  <legend>
                    <span className="sr-only">{fill(copy.forGuest, { name: guest.name })}</span>
                    <span aria-hidden="true">{guest.name}</span>
                    {guest.isChild ? <span className="pill">{childLabel}</span> : null}
                  </legend>
                  <div className="sb-choice-group">
                    {guestOptions.map((status) => (
                      <label key={status} className="sb-choice">
                        <input
                          type="radio"
                          name={`${groupId}-${guest.id}`}
                          value={status}
                          checked={selected === status}
                          disabled={pending}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [guest.id]: status }))
                          }
                        />
                        <span>{statusLabels[status]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <p className="notice">{copy.healthNote}</p>
          {error ? (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          ) : null}
          <div className="dialog-footer">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              {ui.cancel}
            </Button>
            <Button type="submit" pending={pending} pendingLabel={ui.saving}>
              {copy.save}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
