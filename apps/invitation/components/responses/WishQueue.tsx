"use client";

import { Check, EyeOff, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { moderateWishAction, removeWishAction } from "@/app/studio/[eventId]/responses/actions";
import { Badge, Button, ConfirmDialog, useSettle, useToast } from "@/components/ui";
import { fill } from "@/lib/guest-list/fill";

export interface WishView {
  id: string;
  authorName: string;
  partyDisplayName: string | null;
  message: string;
  visibility: "HOSTS_ONLY" | "WALL";
  moderation: "PENDING" | "APPROVED" | "REJECTED";
  /** "12/11/2026, 4:30 PM", formatted on the server. */
  createdOn: string;
}

export interface WishQueueProps {
  eventId: string;
  entries: WishView[];
  copy: InvitationStudioGuestsCopy["responses"]["wishes"];
}

const MODERATION_TONE = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
} as const;

/**
 * Wishes (or tributes) left on the invitation, newest waiting ones first. A message the guest
 * asked to share can be approved or hidden; a message for the hosts only is simply kept or
 * deleted. Deleting asks first.
 */
export function WishQueue({ eventId, entries, copy }: WishQueueProps) {
  const toast = useToast();
  const run = useSettle();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<WishView | null>(null);

  const moderate = (entry: WishView, moderation: "APPROVED" | "REJECTED") => {
    setBusyId(entry.id);
    startTransition(async () => {
      const result = await run(() => moderateWishAction(eventId, entry.id, moderation));
      setBusyId(null);
      if (!result) return;
      if (result.ok) {
        toast.show(moderation === "APPROVED" ? copy.approved : copy.rejected, { tone: "success" });
      } else {
        toast.show(result.message, { tone: "danger" });
      }
    });
  };

  return (
    <>
      <ul className="sb-wishes">
        {entries.map((entry) => {
          const busy = pending && busyId === entry.id;
          const shared = entry.visibility === "WALL";
          return (
            <li key={entry.id} className="sb-wish">
              <div className="sb-wish-head">
                <p className="sb-wish-from">
                  {entry.partyDisplayName && entry.partyDisplayName !== entry.authorName
                    ? fill(copy.fromParty, {
                        author: entry.authorName,
                        party: entry.partyDisplayName,
                      })
                    : fill(copy.from, { author: entry.authorName })}
                  <span className="sb-wish-date num">{entry.createdOn}</span>
                </p>
                <div className="cluster">
                  {shared ? (
                    <Badge tone={MODERATION_TONE[entry.moderation]}>
                      {copy.moderation[entry.moderation]}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{copy.visibility.HOSTS_ONLY}</Badge>
                  )}
                </div>
              </div>
              <blockquote className="sb-wish-message">{entry.message}</blockquote>
              {shared ? <p className="notice">{copy.visibility.WALL}</p> : null}
              <div className="sb-wish-actions">
                {shared && entry.moderation !== "APPROVED" ? (
                  <Button
                    size="small"
                    pending={busy}
                    disabled={pending}
                    aria-label={fill(copy.approveLabel, { author: entry.authorName })}
                    onClick={() => moderate(entry, "APPROVED")}
                  >
                    <Check className="icon" aria-hidden="true" />
                    {copy.approve}
                  </Button>
                ) : null}
                {shared && entry.moderation !== "REJECTED" ? (
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={pending}
                    aria-label={fill(copy.rejectLabel, { author: entry.authorName })}
                    onClick={() => moderate(entry, "REJECTED")}
                  >
                    <EyeOff className="icon" aria-hidden="true" />
                    {copy.reject}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="small"
                  disabled={pending}
                  aria-label={fill(copy.removeLabel, { author: entry.authorName })}
                  onClick={() => setRemoving(entry)}
                >
                  <Trash2 className="icon" aria-hidden="true" />
                  {copy.remove}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        title={copy.removeTitle}
        confirmLabel={copy.removeConfirm}
        tone="danger"
        pending={pending}
        pendingLabel={copy.removing}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const target = removing;
          startTransition(async () => {
            const result = await run(() => removeWishAction(eventId, target.id));
            if (!result) return;
            setRemoving(null);
            toast.show(result.ok ? copy.removed : result.message, {
              tone: result.ok ? "success" : "danger",
            });
          });
        }}
      >
        {copy.removeBody}
      </ConfirmDialog>
    </>
  );
}
