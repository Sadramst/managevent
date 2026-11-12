"use client";

import { Ellipsis, Pencil, Plus, Search, Share2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { removePartyAction } from "@/app/studio/[eventId]/guests/actions";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Menu,
  useSettle,
  useToast,
} from "@/components/ui";
import { fill, fillCount } from "@/lib/guest-list/fill";
import {
  collectTags,
  filterParties,
  tableLabelText,
  type PartyView,
  type RsvpStatus,
} from "@/lib/guest-list/view";
import { AddHouseholdDialog } from "./AddHouseholdDialog";
import { HouseholdEditor } from "./HouseholdEditor";
import { ImportDialog } from "./ImportDialog";
import type { PremiumInfo } from "./PlanLimitNotice";
import { RecordReplyDialog } from "./RecordReplyDialog";
import { StatusBadge } from "./StatusBadge";

export interface GuestListProps {
  eventId: string;
  parties: PartyView[];
  copy: InvitationStudioGuestsCopy["guests"];
  importCopy: InvitationStudioGuestsCopy["importCsv"];
  common: InvitationStudioGuestsCopy["common"];
  /** Null for a memorial event or a paid plan: no Premium pointer is ever shown. */
  premium: PremiumInfo | null;
  allowMaybe: boolean;
  shareHref: string;
  templateHref: string;
}

type Dialog =
  | { kind: "add" }
  | { kind: "import" }
  | { kind: "edit"; partyId: string }
  | { kind: "reply"; partyId: string }
  | { kind: "remove"; partyId: string }
  | null;

const STATUS_ORDER: readonly RsvpStatus[] = ["PENDING", "YES", "MAYBE", "NO"];

/**
 * The guest list: the "Add household" and "Import" actions, search with reply and tag filters,
 * and one row per household with its people, reply, seats, table and tags. All the dialogs
 * (add, edit, record a reply, remove, import) live here so the page stays a server component.
 */
export function GuestList({
  eventId,
  parties,
  copy,
  importCopy,
  common,
  premium,
  allowMaybe,
  shareHref,
  templateHref,
}: GuestListProps) {
  const toast = useToast();
  const run = useSettle();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RsvpStatus | "">("");
  const [tag, setTag] = useState("");
  const [removing, startRemoving] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const tags = useMemo(() => collectTags(parties), [parties]);
  // A tag that no longer exists (its last household was removed) stops filtering.
  const activeTag = tags.includes(tag) ? tag : "";
  const visible = useMemo(
    () => filterParties(parties, { query: deferredQuery, status, tag: activeTag }),
    [parties, deferredQuery, status, activeTag],
  );
  const filtered = query.trim().length > 0 || status !== "" || activeTag !== "";
  const byId = (id: string) => parties.find((party) => party.id === id) ?? null;
  const close = () => setDialog(null);

  const removeTarget = dialog?.kind === "remove" ? byId(dialog.partyId) : null;

  const actions = (
    <div className="cluster sb-actions">
      <Button variant="secondary" onClick={() => setDialog({ kind: "import" })}>
        <Upload className="icon" aria-hidden="true" />
        {copy.importCsv}
      </Button>
      <Button onClick={() => setDialog({ kind: "add" })}>
        <Plus className="icon" aria-hidden="true" />
        {copy.add}
      </Button>
    </div>
  );

  return (
    <>
      {parties.length === 0 ? (
        <EmptyState title={copy.empty.title} actions={actions}>
          <p>{copy.empty.body}</p>
        </EmptyState>
      ) : (
        <>
          <div className="toolbar sb-toolbar">
            <div className="field sb-search">
              <label className="label" htmlFor="guest-search">
                {copy.filters.search}
              </label>
              <div className="sb-search-box">
                <Search className="icon" aria-hidden="true" />
                <input
                  id="guest-search"
                  type="search"
                  placeholder={copy.filters.searchPlaceholder}
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="field sb-filter">
              <label className="label" htmlFor="guest-status">
                {copy.filters.status}
              </label>
              <select
                id="guest-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as RsvpStatus | "")}
              >
                <option value="">{copy.filters.statusAll}</option>
                {STATUS_ORDER.filter((value) => value !== "MAYBE" || allowMaybe).map((value) => (
                  <option key={value} value={value}>
                    {common.status[value]}
                  </option>
                ))}
              </select>
            </div>
            {tags.length > 0 ? (
              <div className="field sb-filter">
                <label className="label" htmlFor="guest-tag">
                  {copy.filters.tag}
                </label>
                <select
                  id="guest-tag"
                  value={activeTag}
                  onChange={(event) => setTag(event.target.value)}
                >
                  <option value="">{copy.filters.tagAll}</option>
                  {tags.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {actions}
          </div>

          <p className="sb-count" role="status">
            {filtered
              ? fill(copy.filters.showing, { shown: visible.length, total: parties.length })
              : fillCount(parties.length, common.householdsCountOne, common.householdsCount)}
            {filtered ? (
              <button
                type="button"
                className="link sb-link-button"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setTag("");
                }}
              >
                {copy.filters.clear}
              </button>
            ) : null}
          </p>

          {visible.length === 0 ? (
            <EmptyState title={copy.filters.noMatchTitle} level={3}>
              <p>{copy.filters.noMatch}</p>
            </EmptyState>
          ) : (
            <ul className="sb-party-list">
              {visible.map((party) => {
                const mixed = party.guests.some((guest) => guest.status !== party.status);
                const checkedIn = party.guests.filter((guest) => guest.checkedIn).length;
                return (
                  <li key={party.id} className="sb-party">
                    <div className="sb-party-main">
                      <div className="sb-party-head">
                        <h3 className="sb-party-name">{party.displayName}</h3>
                        <StatusBadge status={party.status} labels={common.status} />
                        {party.linkOff ? <Badge tone="danger">{copy.row.linkOff}</Badge> : null}
                      </div>
                      <ul className="sb-party-guests">
                        {party.guests.map((guest) => (
                          <li key={guest.id}>
                            <span>{guest.name}</span>
                            {guest.isChild ? <span className="pill">{common.child}</span> : null}
                            {guest.isPlusOne ? (
                              <span className="pill">{common.plusOne}</span>
                            ) : null}
                            {mixed ? (
                              <span className="sb-party-guest-status">
                                {common.status[guest.status]}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      <p className="sb-party-meta">
                        <span>{fillCount(party.maxSeats, common.seatsOne, common.seats)}</span>
                        {party.tableLabel ? (
                          <span>{tableLabelText(party.tableLabel, common.table)}</span>
                        ) : null}
                        {party.allowPlusOnes ? <span>{copy.row.plusOnesAllowed}</span> : null}
                        {party.repliedOn ? (
                          <span>{fill(copy.row.replied, { date: party.repliedOn })}</span>
                        ) : null}
                        {checkedIn > 0 ? (
                          <span>{fill(copy.row.checkedIn, { count: checkedIn })}</span>
                        ) : null}
                      </p>
                      {party.tags.length > 0 ? (
                        <ul className="pills">
                          {party.tags.map((value) => (
                            <li key={value} className="pill">
                              {value}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="sb-party-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        aria-label={fill(copy.row.replyLabel, { name: party.displayName })}
                        onClick={() => setDialog({ kind: "reply", partyId: party.id })}
                      >
                        {copy.row.reply}
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        aria-label={fill(copy.row.editLabel, { name: party.displayName })}
                        onClick={() => setDialog({ kind: "edit", partyId: party.id })}
                      >
                        <Pencil className="icon" aria-hidden="true" />
                        {copy.row.edit}
                      </Button>
                      <Menu
                        label={fill(copy.row.more, { name: party.displayName })}
                        summaryClassName="icon-button"
                        summary={<Ellipsis aria-hidden="true" />}
                      >
                        <ul className="menu-list">
                          <li>
                            <Link className="menu-item" href={shareHref}>
                              <Share2 className="icon" aria-hidden="true" />
                              {copy.row.share}
                            </Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="menu-item sb-menu-danger"
                              onClick={(event) => {
                                event.currentTarget.closest("details")?.removeAttribute("open");
                                setDialog({ kind: "remove", partyId: party.id });
                              }}
                            >
                              <Trash2 className="icon" aria-hidden="true" />
                              {copy.remove.confirm}
                            </button>
                          </li>
                        </ul>
                      </Menu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <AddHouseholdDialog
        eventId={eventId}
        open={dialog?.kind === "add"}
        onClose={close}
        copy={copy.form}
        limitCopy={copy.limit}
        premiumCopy={common.premium}
        premium={premium}
      />
      <ImportDialog
        eventId={eventId}
        open={dialog?.kind === "import"}
        onClose={close}
        copy={importCopy}
        common={common}
        limitCopy={copy.limit}
        premium={premium}
        templateHref={templateHref}
      />
      <HouseholdEditor
        eventId={eventId}
        party={dialog?.kind === "edit" ? byId(dialog.partyId) : null}
        onClose={close}
        copy={copy}
        common={common}
        statusLabels={common.status}
        premium={premium}
      />
      <RecordReplyDialog
        eventId={eventId}
        party={dialog?.kind === "reply" ? byId(dialog.partyId) : null}
        allowMaybe={allowMaybe}
        statusLabels={common.status}
        copy={copy.reply}
        childLabel={common.child}
        onClose={close}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        title={fill(copy.remove.title, { name: removeTarget?.displayName ?? "" })}
        confirmLabel={copy.remove.confirm}
        tone="danger"
        pending={removing}
        pendingLabel={copy.remove.removing}
        onCancel={close}
        onConfirm={() => {
          if (!removeTarget) return;
          const target = removeTarget;
          startRemoving(async () => {
            const result = await run(() => removePartyAction(eventId, target.id));
            if (!result) return;
            close();
            if (result.ok) {
              toast.show(fill(copy.remove.removed, { name: target.displayName }), {
                tone: "success",
              });
            } else {
              toast.show(result.message, { tone: "danger" });
            }
          });
        }}
      >
        {copy.remove.body}
      </ConfirmDialog>
    </>
  );
}
