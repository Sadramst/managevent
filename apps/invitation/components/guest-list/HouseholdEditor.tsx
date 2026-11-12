"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import {
  addGuestAction,
  removeGuestAction,
  updateGuestAction,
  updatePartyAction,
} from "@/app/studio/[eventId]/guests/actions";
import {
  Button,
  ConfirmDialog,
  Drawer,
  Notice,
  TextField,
  useSettle,
  useUiCopy,
} from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { looksLikeEmail } from "@/lib/auth-client";
import { fill } from "@/lib/guest-list/fill";
import { type GuestView, parseTags, type PartyView, tagsAreValid } from "@/lib/guest-list/view";
import { looksLikeAuPhone } from "@/lib/guest-list/whatsapp";
import { PlanLimitNotice, type PremiumInfo, readLimitDetails } from "./PlanLimitNotice";
import { StatusBadge, type StatusLabels } from "./StatusBadge";

type GuestsCopy = InvitationStudioGuestsCopy["guests"];

/** A short confirmation or problem shown inside the drawer. */
interface Note {
  tone: "success" | "danger";
  text: string;
}

/**
 * Feedback inside the drawer. Toasts sit behind a modal's backdrop, so what happens while the
 * drawer is open is confirmed here, in a live region next to the control that caused it.
 */
function InlineNote({ note }: { note: Note | null }) {
  return (
    <p className="sb-inline-note" role="status" data-tone={note?.tone}>
      {note ? (
        <>
          {note.tone === "success" ? <Check className="icon" aria-hidden="true" /> : null}
          {note.text}
        </>
      ) : null}
    </p>
  );
}
type CommonCopy = InvitationStudioGuestsCopy["common"];

export interface HouseholdEditorProps {
  eventId: string;
  /** The household being edited (always the latest server data), or null when closed. */
  party: PartyView | null;
  onClose: () => void;
  copy: GuestsCopy;
  common: CommonCopy;
  statusLabels: StatusLabels;
  premium: PremiumInfo | null;
}

/**
 * The "Edit household" side sheet: the household's own details, then each person in it with
 * inline editing, removal (confirmed) and "Add a guest". Every save is its own small action,
 * so one mistake never loses the rest.
 */
export function HouseholdEditor(props: HouseholdEditorProps) {
  return <EditorDrawer key={props.party?.id ?? "closed"} {...props} />;
}

function EditorDrawer({
  eventId,
  party,
  onClose,
  copy,
  common,
  statusLabels,
  premium,
}: HouseholdEditorProps) {
  const [busy, setBusy] = useState(false);
  /** The last thing that happened to the people list, shown inline in the drawer. */
  const [peopleNote, setPeopleNote] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<GuestView | null>(null);
  const [removePending, startRemove] = useTransition();
  const run = useSettle();
  const people = copy.people;

  const confirmRemove = () => {
    if (!party || !removing) return;
    const target = removing;
    startRemove(async () => {
      const result = await run(() => removeGuestAction(eventId, party.id, target.id));
      if (!result) return;
      setRemoving(null);
      setPeopleNote(
        result.ok
          ? { tone: "success", text: fill(people.removed, { name: target.name }) }
          : { tone: "danger", text: result.message },
      );
    });
  };

  // The confirmation is a sibling of the drawer, not a child: a dialog's `close` and `cancel`
  // events reach React ancestors, so a nested confirmation would close the drawer with it.
  return (
    <>
      <Drawer
        open={party !== null}
        onClose={onClose}
        title={copy.form.editTitle}
        dismissible={!busy && removing === null}
      >
        {party ? (
          <>
            <DetailsForm eventId={eventId} party={party} copy={copy.form} onBusy={setBusy} />
            <People
              eventId={eventId}
              party={party}
              copy={copy}
              common={common}
              statusLabels={statusLabels}
              premium={premium}
              onBusy={setBusy}
              onRemove={setRemoving}
              note={peopleNote}
              onNote={setPeopleNote}
            />
          </>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={removing !== null}
        title={fill(people.removeTitle, { name: removing?.name ?? "" })}
        confirmLabel={people.removeConfirm}
        tone="danger"
        pending={removePending}
        pendingLabel={people.removing}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      >
        {people.removeBody}
      </ConfirmDialog>
    </>
  );
}

function DetailsForm({
  eventId,
  party,
  copy,
  onBusy,
}: {
  eventId: string;
  party: PartyView;
  copy: GuestsCopy["form"];
  onBusy: (busy: boolean) => void;
}) {
  const { ui } = useUiCopy();
  const run = useSettle();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(party.displayName);
  const [seats, setSeats] = useState(String(party.maxSeats));
  const [table, setTable] = useState(party.tableLabel ?? "");
  const [tags, setTags] = useState(party.tags.join(", "));
  const [allowPlusOnes, setAllowPlusOnes] = useState(party.allowPlusOnes);
  const [childrenAllowed, setChildrenAllowed] = useState(party.childrenAllowed);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const displayName = name.trim();
    if (displayName.length === 0) next.name = copy.nameRequired;
    const maxSeats = Number(seats);
    if (!Number.isInteger(maxSeats) || maxSeats < 1 || maxSeats > 20)
      next.seats = copy.seatsInvalid;
    else if (maxSeats < party.guests.length) {
      next.seats = fill(copy.seatsTooFew, { count: party.guests.length });
    }
    const tagList = parseTags(tags);
    if (!tagsAreValid(tagList)) next.tags = copy.tagsTooMany;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setFailure(null);
    setSaved(false);
    onBusy(true);
    startTransition(async () => {
      const result = await run(() =>
        updatePartyAction(eventId, party.id, {
          displayName,
          maxSeats,
          tableLabel: table.trim().length > 0 ? table.trim() : null,
          tags: tagList,
          allowPlusOnes,
          childrenAllowed,
        }),
      );
      onBusy(false);
      if (!result) return;
      if (result.ok) setSaved(true);
      else setFailure(result.message);
    });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="sb-editor-section">
      <TextField
        label={copy.name}
        hint={copy.nameHint}
        error={errors.name}
        value={name}
        maxLength={120}
        autoComplete="off"
        required
        onChange={(event) => setName(event.target.value)}
      />
      <div className="fields">
        <TextField
          label={copy.seats}
          hint={copy.seatsHint}
          error={errors.seats}
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={seats}
          onChange={(event) => setSeats(event.target.value)}
        />
        <TextField
          label={copy.table}
          optional={ui.optional}
          hint={copy.tableHint}
          maxLength={60}
          autoComplete="off"
          value={table}
          onChange={(event) => setTable(event.target.value)}
        />
      </div>
      <TextField
        label={copy.tags}
        optional={ui.optional}
        hint={copy.tagsHint}
        error={errors.tags}
        autoComplete="off"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={allowPlusOnes}
          onChange={(event) => setAllowPlusOnes(event.target.checked)}
        />
        <span>{copy.allowPlusOnes}</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={childrenAllowed}
          onChange={(event) => setChildrenAllowed(event.target.checked)}
        />
        <span>{copy.childrenAllowed}</span>
      </label>
      {failure ? (
        <Notice tone="danger" role="alert">
          {failure}
        </Notice>
      ) : null}
      <div className="form-actions">
        <Button type="submit" pending={pending} pendingLabel={ui.saving}>
          {copy.submitEdit}
        </Button>
        <InlineNote note={saved && !pending ? { tone: "success", text: copy.saved } : null} />
      </div>
    </form>
  );
}

interface GuestFields {
  name: string;
  email: string;
  phone: string;
  isChild: boolean;
}

function GuestForm({
  initial,
  copy,
  submitLabel,
  pending,
  failure,
  onSubmit,
  onCancel,
}: {
  initial: GuestFields;
  copy: GuestsCopy["form"];
  submitLabel: string;
  pending: boolean;
  failure: ReactNode;
  onSubmit: (fields: GuestFields) => void;
  onCancel: () => void;
}) {
  const { ui } = useUiCopy();
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next: Record<string, string> = {};
    if (fields.name.trim().length === 0) next.name = copy.guestNameRequired;
    if (fields.email.trim().length > 0 && !looksLikeEmail(fields.email))
      next.email = copy.emailInvalid;
    if (fields.phone.trim().length > 0 && !looksLikeAuPhone(fields.phone))
      next.phone = copy.phoneInvalid;
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(fields);
  };

  return (
    <form noValidate onSubmit={submit} className="sb-person-form">
      <TextField
        label={copy.guestName}
        error={errors.name}
        value={fields.name}
        maxLength={120}
        autoComplete="off"
        autoFocus
        required
        onChange={(event) => setFields({ ...fields, name: event.target.value })}
      />
      <div className="fields">
        <TextField
          label={copy.guestEmail}
          optional={ui.optional}
          error={errors.email}
          type="email"
          inputMode="email"
          autoComplete="off"
          maxLength={254}
          value={fields.email}
          onChange={(event) => setFields({ ...fields, email: event.target.value })}
        />
        <TextField
          label={copy.guestPhone}
          optional={ui.optional}
          hint={copy.guestPhoneHint}
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={20}
          value={fields.phone}
          onChange={(event) => setFields({ ...fields, phone: event.target.value })}
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={fields.isChild}
          onChange={(event) => setFields({ ...fields, isChild: event.target.checked })}
        />
        <span>{copy.guestChild}</span>
      </label>
      {failure}
      <div className="form-actions">
        <Button type="submit" size="small" pending={pending} pendingLabel={ui.saving}>
          {submitLabel}
        </Button>
        <Button variant="ghost" size="small" onClick={onCancel} disabled={pending}>
          {ui.cancel}
        </Button>
      </div>
    </form>
  );
}

function People({
  eventId,
  party,
  copy,
  common,
  statusLabels,
  premium,
  onBusy,
  onRemove,
  note,
  onNote,
}: {
  eventId: string;
  party: PartyView;
  copy: GuestsCopy;
  common: CommonCopy;
  statusLabels: StatusLabels;
  premium: PremiumInfo | null;
  onBusy: (busy: boolean) => void;
  /** Asks the drawer to confirm removing this guest. */
  onRemove: (guest: GuestView) => void;
  note: Note | null;
  onNote: (note: Note | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const settleAction = useSettle();
  /** A guest id being edited, "new" for the add form, or null. */
  const [editing, setEditing] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    message: string;
    limit: { limit: number; used: number } | null;
  } | null>(null);
  const people = copy.people;

  const open = (target: string | null) => {
    setFailure(null);
    onNote(null);
    setEditing(target);
  };

  const run = (action: () => Promise<ActionResult<unknown>>, done: string) => {
    setFailure(null);
    onNote(null);
    onBusy(true);
    startTransition(async () => {
      // On a dropped connection the open form stays open, with what was typed and the reason.
      const result = await settleAction(action);
      onBusy(false);
      if (!result) return;
      if (result.ok) {
        onNote({ tone: "success", text: done });
        setEditing(null);
        return;
      }
      setFailure({
        message: result.message,
        limit: result.code === "PLAN_LIMIT_EXCEEDED" ? readLimitDetails(result.details) : null,
      });
    });
  };

  const failureNotice = failure ? (
    failure.limit ? (
      <PlanLimitNotice
        limit={failure.limit.limit}
        used={failure.limit.used}
        copy={copy.limit}
        premiumCopy={common.premium}
        premium={premium}
      />
    ) : (
      <Notice tone="danger" role="alert">
        {failure.message}
      </Notice>
    )
  ) : null;

  const contactFields = (fields: GuestFields) => ({
    name: fields.name.trim(),
    isChild: fields.isChild,
    email: fields.email.trim().length > 0 ? fields.email.trim() : null,
    phone: fields.phone.trim().length > 0 ? fields.phone.trim() : null,
  });

  return (
    <section className="sb-editor-section" aria-labelledby="editor-people-title">
      <h3 id="editor-people-title" className="sb-heading">
        {people.title}
      </h3>
      <ul className="sb-person-list">
        {party.guests.map((guest) => (
          <li key={guest.id} className="sb-person">
            {editing === guest.id ? (
              <GuestForm
                initial={{
                  name: guest.name,
                  email: guest.email ?? "",
                  phone: guest.phone ?? "",
                  isChild: guest.isChild,
                }}
                copy={copy.form}
                submitLabel={people.save}
                pending={pending}
                failure={failureNotice}
                onCancel={() => open(null)}
                onSubmit={(fields) =>
                  run(
                    () => updateGuestAction(eventId, party.id, guest.id, contactFields(fields)),
                    people.saved,
                  )
                }
              />
            ) : (
              <div className="sb-person-row">
                <div className="sb-person-main">
                  <p className="sb-person-name">
                    {guest.name}
                    {guest.isChild ? <span className="pill">{common.child}</span> : null}
                    {guest.isPlusOne ? <span className="pill">{common.plusOne}</span> : null}
                  </p>
                  <p className="sb-person-contact">
                    {guest.email || guest.phone ? (
                      <>
                        {guest.email ? <bdi>{guest.email}</bdi> : null}
                        {guest.email && guest.phone ? " · " : null}
                        {guest.phone ? <bdi>{guest.phone}</bdi> : null}
                      </>
                    ) : (
                      people.noContact
                    )}
                  </p>
                  <StatusBadge status={guest.status} labels={statusLabels} />
                </div>
                <div className="sb-person-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={fill(people.editLabel, { name: guest.name })}
                    onClick={() => open(guest.id)}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={fill(people.removeLabel, { name: guest.name })}
                    disabled={party.guests.length <= 1}
                    onClick={() => {
                      setFailure(null);
                      onNote(null);
                      onRemove(guest);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {party.guests.length <= 1 ? <p className="notice">{people.lastGuest}</p> : null}
      <InlineNote note={note} />

      {editing === "new" ? (
        <div className="sb-person sb-person-new">
          <GuestForm
            initial={{ name: "", email: "", phone: "", isChild: false }}
            copy={copy.form}
            submitLabel={people.addSubmit}
            pending={pending}
            failure={failureNotice}
            onCancel={() => open(null)}
            onSubmit={(fields) => {
              const input = contactFields(fields);
              run(
                () =>
                  addGuestAction(eventId, party.id, {
                    name: input.name,
                    isChild: input.isChild,
                    ...(input.email ? { email: input.email } : {}),
                    ...(input.phone ? { phone: input.phone } : {}),
                  }),
                fill(people.added, { name: input.name }),
              );
            }}
          />
        </div>
      ) : (
        <>
          {editing === null ? failureNotice : null}
          <Button variant="secondary" size="small" onClick={() => open("new")}>
            <Plus className="icon" aria-hidden="true" />
            {people.add}
          </Button>
        </>
      )}
    </section>
  );
}
