"use client";

import {
  Ban,
  Ellipsis,
  MessageCircle,
  MessageSquareText,
  QrCode,
  RotateCcw,
  Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { reissueLinkAction, revokeLinkAction } from "@/app/studio/[eventId]/share/actions";
import { StatusBadge } from "@/components/guest-list/StatusBadge";
import {
  Badge,
  Button,
  buttonClass,
  ConfirmDialog,
  CopyButton,
  copyText,
  ManualCopyField,
  Menu,
  useSettle,
  useToast,
  useUiCopy,
} from "@/components/ui";
import { fill, fillCount } from "@/lib/guest-list/fill";
import { personalise } from "@/lib/guest-list/messages";
import { type LinkPartyView, matchesQuery, tableLabelText } from "@/lib/guest-list/view";
import { whatsAppUrl } from "@/lib/guest-list/whatsapp";
import { QrDialog } from "./QrDialog";
import { UpgradePassButton } from "./UpgradePassButton";

export interface ShareLinksProps {
  eventId: string;
  parties: LinkPartyView[];
  /** The invitation message for this event, with `{name}` and `{link}` still to fill. */
  messageTemplate: string;
  copy: InvitationStudioGuestsCopy["share"];
  common: InvitationStudioGuestsCopy["common"];
  canEdit?: boolean;
  canUpgrade?: boolean;
  networkError?: string;
}

type Confirm = { kind: "revoke" | "reissue"; partyId: string } | null;

/** Show the search box once the list is long enough to need it. */
const SEARCH_FROM = 6;

/**
 * One row per household with its private link: copy it, open WhatsApp with the message ready,
 * show a QR code, or turn the link off and issue a new one (both confirmed first).
 */
export function ShareLinks({
  eventId,
  parties,
  messageTemplate,
  copy,
  common,
  canEdit = true,
  canUpgrade = false,
  networkError = "",
}: ShareLinksProps) {
  const { ui } = useUiCopy();
  const toast = useToast();
  const run = useSettle();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  /** The household whose message could not be copied: it is shown in the row to copy by hand. */
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const links = copy.links;

  const visible = useMemo(
    () => parties.filter((party) => matchesQuery(party, deferredQuery)),
    [parties, deferredQuery],
  );
  const byId = (id: string | null) => parties.find((party) => party.id === id) ?? null;
  const confirmParty = byId(confirm?.partyId ?? null);
  const confirmCopy = confirm?.kind === "reissue" ? copy.reissue : copy.revoke;

  const runConfirm = () => {
    if (!confirm || !confirmParty) return;
    const { kind } = confirm;
    const target = confirmParty;
    startTransition(async () => {
      const result = await run(() =>
        kind === "revoke"
          ? revokeLinkAction(eventId, target.id)
          : reissueLinkAction(eventId, target.id),
      );
      if (!result) return;
      setConfirm(null);
      if (result.ok) {
        const done = kind === "revoke" ? copy.revoke.done : copy.reissue.done;
        toast.show(fill(done, { name: target.displayName }), { tone: "success" });
      } else {
        toast.show(result.message, { tone: "danger" });
      }
    });
  };

  const closeMenu = (element: HTMLElement) => element.closest("details")?.removeAttribute("open");

  return (
    <>
      {parties.length >= SEARCH_FROM ? (
        <div className="toolbar sb-toolbar">
          <div className="field sb-search">
            <label className="label" htmlFor="share-search">
              {links.search}
            </label>
            <div className="sb-search-box">
              <Search className="icon" aria-hidden="true" />
              <input
                id="share-search"
                type="search"
                placeholder={links.searchPlaceholder}
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="sb-count" role="status">
          {links.noMatch}
        </p>
      ) : (
        <ul className="sb-party-list">
          {visible.map((party) => {
            const url = party.inviteUrl;
            const active = url !== null && !party.linkOff;
            const lockedByPlan = url === null && canEdit;
            const message = url ? personalise(messageTemplate, party.displayName, url) : "";
            return (
              <li key={party.id} className="sb-party sb-share-row">
                <div className="sb-party-main">
                  <div className="sb-party-head">
                    <h3 className="sb-party-name">{party.displayName}</h3>
                    <StatusBadge status={party.status} labels={common.status} />
                    {party.linkOff ? <Badge tone="danger">{links.linkOff}</Badge> : null}
                    {lockedByPlan ? <Badge tone="warning">{links.lockedBadge}</Badge> : null}
                  </div>
                  <p className="sb-party-meta">
                    <span>
                      {fillCount(party.guests.length, common.guestsCountOne, common.guestsCount)}
                    </span>
                    {party.tableLabel ? (
                      <span>{tableLabelText(party.tableLabel, common.table)}</span>
                    ) : null}
                    {party.emailedOn ? (
                      <span>{fill(links.emailed, { date: party.emailedOn })}</span>
                    ) : null}
                  </p>
                  {url === null ? (
                    <p className="notice">{canEdit ? links.lockedNote : common.viewOnlyLinks}</p>
                  ) : null}
                  {party.linkOff && url !== null ? (
                    <p className="notice">{links.linkOffNote}</p>
                  ) : null}
                </div>

                {url !== null ? (
                  <div className="sb-party-actions">
                    {active ? (
                      <>
                        <CopyButton
                          value={url}
                          label={links.copy}
                          copiedLabel={links.copied}
                          onCopied={() => toast.show(links.copied, { tone: "success" })}
                        />
                        <a
                          className={buttonClass({ variant: "secondary", size: "small" })}
                          href={whatsAppUrl(party.phone, message)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={fill(links.whatsappLabel, { name: party.displayName })}
                        >
                          <MessageCircle className="icon" aria-hidden="true" />
                          {links.whatsapp}
                        </a>
                        <Button
                          variant="secondary"
                          size="small"
                          aria-label={fill(links.qrLabel, { name: party.displayName })}
                          onClick={() => setQrFor(party.id)}
                        >
                          <QrCode className="icon" aria-hidden="true" />
                          {links.qr}
                        </Button>
                        <Menu
                          label={fill(links.more, { name: party.displayName })}
                          summaryClassName="icon-button"
                          summary={<Ellipsis aria-hidden="true" />}
                        >
                          <ul className="menu-list">
                            <li>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={async (event) => {
                                  const element = event.currentTarget;
                                  const copied = await copyText(message);
                                  closeMenu(element);
                                  setManualFor(copied ? null : party.id);
                                  if (copied) {
                                    toast.show(links.messageCopied, { tone: "success" });
                                  }
                                }}
                              >
                                <MessageSquareText className="icon" aria-hidden="true" />
                                {links.copyMessage}
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={(event) => {
                                  closeMenu(event.currentTarget);
                                  setConfirm({ kind: "reissue", partyId: party.id });
                                }}
                              >
                                <RotateCcw className="icon" aria-hidden="true" />
                                {links.reissue}
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="menu-item sb-menu-danger"
                                onClick={(event) => {
                                  closeMenu(event.currentTarget);
                                  setConfirm({ kind: "revoke", partyId: party.id });
                                }}
                              >
                                <Ban className="icon" aria-hidden="true" />
                                {links.revoke}
                              </button>
                            </li>
                          </ul>
                        </Menu>
                        {manualFor === party.id ? (
                          <ManualCopyField value={message} message={ui.copyFailed} />
                        ) : null}
                      </>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => setConfirm({ kind: "reissue", partyId: party.id })}
                      >
                        <RotateCcw className="icon" aria-hidden="true" />
                        {links.reissue}
                      </Button>
                    )}
                  </div>
                ) : lockedByPlan && canUpgrade ? (
                  <div className="sb-party-actions">
                    <UpgradePassButton
                      eventId={eventId}
                      label={links.unlockRow}
                      workingLabel={copy.freeTier.unlocking}
                      networkError={networkError}
                      size="small"
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <QrDialog
        party={byId(qrFor)}
        onClose={() => setQrFor(null)}
        copy={copy.qr}
        copyLinkLabel={links.copy}
        copiedLabel={links.copied}
      />
      <ConfirmDialog
        open={confirm !== null && confirmParty !== null}
        title={fill(confirmCopy.title, { name: confirmParty?.displayName ?? "" })}
        confirmLabel={confirmCopy.confirm}
        tone={confirm?.kind === "revoke" ? "danger" : "default"}
        pending={pending}
        pendingLabel={confirmCopy.working}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      >
        {confirmCopy.body}
      </ConfirmDialog>
    </>
  );
}
