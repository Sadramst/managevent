"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { RecordReplyDialog } from "@/components/guest-list/RecordReplyDialog";
import { Badge, Button, buttonClass, CopyButton, useToast } from "@/components/ui";
import { fill, fillCount } from "@/lib/guest-list/fill";
import { personalise } from "@/lib/guest-list/messages";
import type { LinkPartyView } from "@/lib/guest-list/view";
import { whatsAppUrl } from "@/lib/guest-list/whatsapp";

export interface AwaitingListProps {
  eventId: string;
  /** Households with someone still to answer. */
  parties: LinkPartyView[];
  /** The reminder for this event, with `{name}` and `{link}` still to fill. */
  reminderTemplate: string;
  allowMaybe: boolean;
  copy: InvitationStudioGuestsCopy["awaiting"];
  replyCopy: InvitationStudioGuestsCopy["guests"]["reply"];
  common: InvitationStudioGuestsCopy["common"];
}

/**
 * Households still to reply. For each: copy a reminder that already carries their private
 * link, open WhatsApp with it typed in, or record the answer they gave you in person.
 */
export function AwaitingList({
  eventId,
  parties,
  reminderTemplate,
  allowMaybe,
  copy,
  replyCopy,
  common,
}: AwaitingListProps) {
  const toast = useToast();
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const list = copy.list;

  return (
    <>
      <ul className="sb-party-list">
        {parties.map((party) => {
          const url = party.inviteUrl;
          const canSend = url !== null && !party.linkOff;
          const message = url ? personalise(reminderTemplate, party.displayName, url) : "";
          const waiting = party.guests.filter((guest) => guest.status === "PENDING");
          return (
            <li key={party.id} className="sb-party">
              <div className="sb-party-main">
                <div className="sb-party-head">
                  <h3 className="sb-party-name">{party.displayName}</h3>
                  {party.linkOff ? <Badge tone="danger">{list.linkOff}</Badge> : null}
                </div>
                {waiting.length > 0 && waiting.length < party.guests.length ? (
                  <p className="sb-party-meta">
                    <span>
                      {fill(list.waitingOn, {
                        names: waiting.map((guest) => guest.name).join(", "),
                      })}
                    </span>
                  </p>
                ) : null}
                <p className="sb-party-meta">
                  <span>
                    {fillCount(party.guests.length, common.guestsCountOne, common.guestsCount)}
                  </span>
                  {party.remindersSent > 0 ? (
                    <span>{fillCount(party.remindersSent, list.remindedOne, list.reminded)}</span>
                  ) : null}
                </p>
                {url === null ? <p className="notice">{common.viewOnlyLinks}</p> : null}
              </div>
              <div className="sb-party-actions">
                {canSend ? (
                  <>
                    <CopyButton
                      value={message}
                      label={list.copy}
                      copiedLabel={copy.reminder.copied}
                      onCopied={() => toast.show(copy.reminder.copied, { tone: "success" })}
                    />
                    <a
                      className={buttonClass({ variant: "secondary", size: "small" })}
                      href={whatsAppUrl(party.phone, message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={fill(list.whatsappLabel, { name: party.displayName })}
                    >
                      <MessageCircle className="icon" aria-hidden="true" />
                      {list.whatsapp}
                    </a>
                  </>
                ) : null}
                <Button
                  variant="secondary"
                  size="small"
                  aria-label={fill(list.recordLabel, { name: party.displayName })}
                  onClick={() => setReplyFor(party.id)}
                >
                  {list.record}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <RecordReplyDialog
        eventId={eventId}
        party={parties.find((party) => party.id === replyFor) ?? null}
        allowMaybe={allowMaybe}
        statusLabels={common.status}
        copy={replyCopy}
        childLabel={common.child}
        onClose={() => setReplyFor(null)}
      />
    </>
  );
}
