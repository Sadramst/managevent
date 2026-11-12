"use client";

import type { InvitationGuestCopy, InvitationGuestVoice } from "@managevent/i18n";
import type { GuestPartyView, GuestRsvpView, RsvpConfig } from "@managevent/validators";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { RsvpActionData } from "@/lib/guest/actions";
import type { GuestLink } from "@/lib/guest/paths";
import { replyOutcome } from "./model";
import { RsvpForm } from "./RsvpForm";

export interface RsvpPanelProps {
  link: GuestLink;
  party: GuestPartyView;
  rsvp: GuestRsvpView;
  config: RsvpConfig;
  /** Why nothing can be sent, when `rsvp.state` is `READ_ONLY`. */
  readOnly: "demo" | "preview" | null;
  /** The event includes door passes (a pass exists for each person who is coming). */
  passEnabled: boolean;
  passHref: string;
  calendarHref: string;
  privacyHref: string;
  voice: InvitationGuestVoice;
  copy: InvitationGuestCopy["rsvp"];
  labels: { addToCalendar: string; viewPasses: string; tableLabel: string; optional: string };
}

type StatusTone = "success" | "neutral" | "warning";

const STATUS_TONE: Record<string, StatusTone> = {
  YES: "success",
  NO: "neutral",
  MAYBE: "warning",
  PENDING: "neutral",
};

/**
 * The reply section: the form while replies are open, the guest's answers once they have
 * replied (with a way to change them), and a plain statement once replies have closed.
 *
 * The server renders it from the guest view; after a successful send it shows what the API says
 * is now stored, so the confirmation is never the form's own optimism.
 */
export function RsvpPanel({
  link,
  party: initialParty,
  rsvp: initialRsvp,
  config,
  readOnly,
  passEnabled,
  passHref,
  calendarHref,
  privacyHref,
  voice,
  copy,
  labels,
}: RsvpPanelProps) {
  const [party, setParty] = useState(initialParty);
  const [rsvp, setRsvp] = useState(initialRsvp);
  const [editing, setEditing] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const confirmation = useRef<HTMLDivElement>(null);

  const closed = rsvp.state === "CLOSED";
  const showForm = !closed && (editing || !rsvp.hasResponded);

  useEffect(() => {
    if (justSent) confirmation.current?.focus();
  }, [justSent]);

  const onSubmitted = (data: RsvpActionData) => {
    setParty(data.party);
    setRsvp(data.rsvp);
    setEditing(false);
    setJustSent(true);
  };

  if (showForm) {
    return (
      <RsvpForm
        link={link}
        party={party}
        rsvp={rsvp}
        config={config}
        readOnly={readOnly}
        isUpdate={rsvp.hasResponded}
        privacyHref={privacyHref}
        voice={voice}
        copy={copy}
        optionalLabel={labels.optional}
        onSubmitted={onSubmitted}
        onCancel={rsvp.hasResponded ? () => setEditing(false) : undefined}
      />
    );
  }

  const outcome = replyOutcome(party.members);
  const anyComing = party.members.some((member) => member.status === "YES");
  const confirmTitle =
    outcome === "YES"
      ? voice.confirmTitleYes
      : outcome === "MAYBE"
        ? voice.confirmTitleMaybe
        : voice.confirmTitleNo;

  return (
    <div className="inv-reply">
      {closed ? (
        <Notice tone="info" title={voice.closedTitle}>
          {rsvp.hasResponded ? voice.closedWithReply : voice.closedNoReply}
        </Notice>
      ) : null}

      {justSent ? (
        <div ref={confirmation} tabIndex={-1} className="inv-confirm" role="status">
          <h3 className="inv-confirm-title">{confirmTitle}</h3>
          <p>{voice.confirmLead}</p>
        </div>
      ) : null}

      {rsvp.hasResponded ? (
        <>
          {justSent ? null : <h3 className="inv-reply-title">{copy.summary.title}</h3>}
          <ul className="inv-reply-list">
            {party.members.map((member) => (
              <li key={member.guestId}>
                <span className="inv-reply-name">
                  {member.name}
                  {member.healthOnFile ? (
                    <span className="inv-reply-note">{copy.summary.healthOnFile}</span>
                  ) : null}
                </span>
                <Badge tone={STATUS_TONE[member.status] ?? "neutral"}>
                  {voice.statusLabel[member.status]}
                </Badge>
              </li>
            ))}
          </ul>

          {anyComing && party.tableLabel ? (
            <p className="inv-reply-extra">
              <strong>{labels.tableLabel}:</strong> {party.tableLabel}
            </p>
          ) : null}
          {rsvp.songRequests.length > 0 ? (
            <p className="inv-reply-extra">
              <strong>{copy.summary.songs}:</strong> {rsvp.songRequests.join(", ")}
            </p>
          ) : null}
          {rsvp.messageToHost ? (
            <div className="inv-reply-extra">
              <strong>{copy.summary.message}</strong>
              <blockquote className="inv-reply-message">{rsvp.messageToHost}</blockquote>
            </div>
          ) : null}

          {anyComing && passEnabled ? (
            <p className="inv-reply-passes">
              <strong>{copy.summary.passesTitle}.</strong> {copy.summary.passesBody}
            </p>
          ) : null}

          <div className="form-actions">
            {anyComing && passEnabled ? (
              <a className={buttonClass({})} href={passHref}>
                {labels.viewPasses}
              </a>
            ) : null}
            {anyComing ? (
              <a
                className={buttonClass({ variant: "secondary" })}
                href={calendarHref}
                download
                rel="nofollow"
              >
                {labels.addToCalendar}
              </a>
            ) : null}
            {closed ? null : (
              <Button
                variant={anyComing ? "ghost" : "secondary"}
                onClick={() => {
                  setJustSent(false);
                  setEditing(true);
                }}
              >
                {copy.summary.change}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
