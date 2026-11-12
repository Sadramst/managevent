"use client";

import { Send } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { EmailCampaignResult } from "@managevent/validators";
import { sendEmailInvitationsAction } from "@/app/studio/[eventId]/share/actions";
import { PremiumPointer } from "@/components/guest-list/PremiumPointer";
import { type PremiumInfo, readLimitDetails } from "@/components/guest-list/PlanLimitNotice";
import { Button, Notice, useSettle } from "@/components/ui";
import { fill, fillCount } from "@/lib/guest-list/fill";
import { newUuid } from "@/lib/guest-list/uuid";
import type { EmailPartyView } from "@/lib/guest-list/view";

export interface EmailInvitationsProps {
  eventId: string;
  /** Households that have an email address (names only: no links, no contact details). */
  parties: EmailPartyView[];
  quota: { limit: number | null; used: number };
  copy: InvitationStudioGuestsCopy["share"]["email"];
  premiumCopy: InvitationStudioGuestsCopy["common"]["premium"];
  premium: PremiumInfo | null;
}

const canEmail = (party: EmailPartyView) => !party.linkOff && party.emailedOn === null;

/**
 * Bulk email invitations: choose households, tick the consent attestation, send. The result
 * says how many were queued and, by name, who was skipped and why. Rendered only when the
 * deployment can send email and the invitation is published.
 */
export function EmailInvitations({
  eventId,
  parties,
  quota,
  copy,
  premiumCopy,
  premium,
}: EmailInvitationsProps) {
  const consentId = useId();
  const run = useSettle();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(parties.filter(canEmail).map((party) => party.id)),
  );
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overQuota, setOverQuota] = useState<{ limit: number; used: number } | null>(null);
  const [result, setResult] = useState<EmailCampaignResult | null>(null);
  // A new key after each successful send, so the next send is a new campaign.
  const [idempotencyKey, setIdempotencyKey] = useState(newUuid);

  const names = useMemo(
    () => new Map(parties.map((party) => [party.id, party.displayName])),
    [parties],
  );
  // Selections for households that have since been removed are ignored.
  const chosen = parties.filter((party) => selected.has(party.id)).map((party) => party.id);

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = () => {
    setError(null);
    setOverQuota(null);
    if (chosen.length === 0) {
      setError(copy.noneSelected);
      return;
    }
    if (!consent) {
      setError(copy.consentRequired);
      return;
    }
    startTransition(async () => {
      // After a dropped connection the selection and the key are still here: sending again
      // with the same key returns the same campaign, so nobody is emailed twice.
      const response = await run(() =>
        sendEmailInvitationsAction(eventId, chosen, true, idempotencyKey),
      );
      if (!response) return;
      if (response.ok) {
        setResult(response.data);
        setSelected(new Set());
        setConsent(false);
        setIdempotencyKey(newUuid());
        return;
      }
      const limit =
        response.code === "PLAN_LIMIT_EXCEEDED" ? readLimitDetails(response.details, "used") : null;
      if (limit) setOverQuota(limit);
      else setError(response.message);
    });
  };

  return (
    <form
      noValidate
      className="sb-email-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="sb-quota">
        {quota.limit !== null
          ? fill(copy.quota, { used: quota.used, limit: quota.limit })
          : fill(copy.quotaUnlimited, { used: quota.used })}
      </p>

      {result ? (
        <Notice tone="success" role="status" title={copy.resultTitle}>
          <p>
            {result.queued === 0
              ? copy.resultNone
              : fillCount(result.queued, copy.resultOne, copy.result, { queued: result.queued })}
          </p>
          {result.skipped.length > 0 ? (
            <>
              <p className="sb-skipped-title">{copy.skippedTitle}</p>
              <ul className="sb-skipped">
                {result.skipped.map((item) => (
                  <li key={`${item.partyId}-${item.reason}`}>
                    <strong>{names.get(item.partyId) ?? ""}</strong> {copy.skipped[item.reason]}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Notice>
      ) : null}

      <fieldset className="fieldset sb-email-list">
        <legend>{copy.selectLegend}</legend>
        <div className="cluster sb-email-tools">
          <Button
            variant="ghost"
            size="small"
            disabled={pending}
            onClick={() => setSelected(new Set(parties.filter(canEmail).map((party) => party.id)))}
          >
            {copy.selectAll}
          </Button>
          <Button
            variant="ghost"
            size="small"
            disabled={pending || chosen.length === 0}
            onClick={() => setSelected(new Set())}
          >
            {copy.selectNone}
          </Button>
          <span className="sb-email-count" role="status">
            {fill(copy.selected, { count: chosen.length })}
          </span>
        </div>
        <ul className="sb-check-list">
          {parties.map((party) => (
            <li key={party.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.has(party.id)}
                  disabled={pending || party.linkOff}
                  onChange={(event) => toggle(party.id, event.target.checked)}
                />
                <span>
                  <span className="sb-check-name">{party.displayName}</span>
                  {party.linkOff ? (
                    <span className="sb-check-note">{copy.linkOff}</span>
                  ) : party.emailedOn ? (
                    <span className="sb-check-note">
                      {fill(copy.alreadySent, { date: party.emailedOn })}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

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

      {overQuota ? (
        <Notice tone="warning" role="alert" title={copy.overQuotaTitle}>
          <p>{fill(copy.overQuota, overQuota)}</p>
          {premium ? <PremiumPointer {...premium} copy={premiumCopy} /> : null}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      ) : null}

      <div className="form-actions">
        <Button type="submit" pending={pending} pendingLabel={copy.sending}>
          <Send className="icon" aria-hidden="true" />
          {chosen.length === 0 ? copy.sendNone : fillCount(chosen.length, copy.sendOne, copy.send)}
        </Button>
      </div>
    </form>
  );
}
