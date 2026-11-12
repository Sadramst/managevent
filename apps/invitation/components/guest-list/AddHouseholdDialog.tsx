"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { HostPartyCreateInput } from "@managevent/validators";
import { createPartyAction } from "@/app/studio/[eventId]/guests/actions";
import { Button, Modal, Notice, TextField, useSettle, useToast, useUiCopy } from "@/components/ui";
import { looksLikeEmail } from "@/lib/auth-client";
import { fill } from "@/lib/guest-list/fill";
import { newUuid } from "@/lib/guest-list/uuid";
import { parseTags, tagsAreValid } from "@/lib/guest-list/view";
import { looksLikeAuPhone } from "@/lib/guest-list/whatsapp";
import { PlanLimitNotice, type PremiumInfo, readLimitDetails } from "./PlanLimitNotice";

type GuestsCopy = InvitationStudioGuestsCopy["guests"];

export interface AddHouseholdDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  copy: GuestsCopy["form"];
  limitCopy: GuestsCopy["limit"];
  premiumCopy: InvitationStudioGuestsCopy["common"]["premium"];
  premium: PremiumInfo | null;
}

interface GuestDraft {
  key: number;
  name: string;
  email: string;
  phone: string;
  isChild: boolean;
  showContact: boolean;
}

type Errors = Record<string, string>;

const MAX_GUESTS = 20;

const emptyGuest = (key: number): GuestDraft => ({
  key,
  name: "",
  email: "",
  phone: "",
  isChild: false,
  showContact: false,
});

/** "Add a household": name, the people in it, seats, table, tags and plus-ones. */
export function AddHouseholdDialog(props: AddHouseholdDialogProps) {
  // A fresh form (and a fresh idempotency key) every time the dialog opens.
  const [instance, setInstance] = useState(0);
  // Shown at the top of the next blank form after "Add and start another": a toast would sit
  // behind the dialog's backdrop.
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  return (
    <AddHouseholdForm
      key={`${props.open ? "open" : "closed"}-${instance}`}
      {...props}
      lastAdded={props.open ? lastAdded : null}
      onClose={() => {
        setLastAdded(null);
        props.onClose();
      }}
      onAddAnother={(message) => {
        setLastAdded(message);
        setInstance((current) => current + 1);
      }}
    />
  );
}

function AddHouseholdForm({
  eventId,
  open,
  onClose,
  copy,
  limitCopy,
  premiumCopy,
  premium,
  lastAdded,
  onAddAnother,
}: AddHouseholdDialogProps & {
  lastAdded: string | null;
  onAddAnother: (message: string) => void;
}) {
  const { ui } = useUiCopy();
  const toast = useToast();
  const run = useSettle();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const nextKey = useRef(2);
  // One key per form: a double press or a retry after a dropped connection adds it only once.
  const [idempotencyKey] = useState(newUuid);

  const [name, setName] = useState("");
  const [guests, setGuests] = useState<GuestDraft[]>(() => [emptyGuest(1)]);
  const [seats, setSeats] = useState("");
  const [table, setTable] = useState("");
  const [tags, setTags] = useState("");
  const [allowPlusOnes, setAllowPlusOnes] = useState(false);
  const [childrenAllowed, setChildrenAllowed] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<{
    message: string;
    limit: { limit: number; used: number } | null;
  } | null>(null);

  const updateGuest = (key: number, patch: Partial<GuestDraft>) =>
    setGuests((current) =>
      current.map((guest) => (guest.key === key ? { ...guest, ...patch } : guest)),
    );

  const validate = (): HostPartyCreateInput | null => {
    const next: Errors = {};
    const displayName = name.trim();
    if (displayName.length === 0) next.name = copy.nameRequired;

    const named = guests.filter(
      (guest) =>
        guest.name.trim().length > 0 ||
        guest.email.trim().length > 0 ||
        guest.phone.trim().length > 0,
    );
    for (const guest of named) {
      if (guest.name.trim().length === 0) next[`guest-${guest.key}-name`] = copy.guestNameRequired;
      if (guest.email.trim().length > 0 && !looksLikeEmail(guest.email.trim())) {
        next[`guest-${guest.key}-email`] = copy.emailInvalid;
      }
      if (guest.phone.trim().length > 0 && !looksLikeAuPhone(guest.phone)) {
        next[`guest-${guest.key}-phone`] = copy.phoneInvalid;
      }
    }

    const people = Math.max(named.length, 1);
    let maxSeats: number | undefined;
    if (seats.trim().length > 0) {
      const parsed = Number(seats);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) next.seats = copy.seatsInvalid;
      else if (parsed < people) next.seats = fill(copy.seatsTooFew, { count: people });
      else maxSeats = parsed;
    }

    const tagList = parseTags(tags);
    if (!tagsAreValid(tagList)) next.tags = copy.tagsTooMany;

    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Move focus to the first field with a problem so the message is heard and seen.
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return null;
    }

    return {
      displayName,
      ...(maxSeats !== undefined ? { maxSeats } : {}),
      allowPlusOnes,
      childrenAllowed,
      tags: tagList,
      ...(table.trim().length > 0 ? { tableLabel: table.trim() } : {}),
      guests: named.map((guest) => ({
        name: guest.name.trim(),
        isChild: guest.isChild,
        ...(guest.email.trim().length > 0 ? { email: guest.email.trim() } : {}),
        ...(guest.phone.trim().length > 0 ? { phone: guest.phone.trim() } : {}),
      })),
    };
  };

  const submit = (addAnother: boolean) => {
    const input = validate();
    if (!input) return;
    setFailure(null);
    startTransition(async () => {
      // A dropped connection comes back as a failure: the form, and its key, stay as they are.
      const result = await run(() => createPartyAction(eventId, input, idempotencyKey));
      if (!result) return;
      if (result.ok) {
        const message = fill(copy.added, { name: result.data.displayName });
        if (addAnother) {
          onAddAnother(message);
        } else {
          toast.show(message, { tone: "success" });
          onClose();
        }
        return;
      }
      setFailure({
        message: result.message,
        limit: result.code === "PLAN_LIMIT_EXCEEDED" ? readLimitDetails(result.details) : null,
      });
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.addTitle}
      description={copy.addLead}
      dismissible={!pending}
    >
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        {lastAdded ? (
          <Notice tone="success" role="status" className="sb-notice">
            {lastAdded}
          </Notice>
        ) : null}
        <TextField
          label={copy.name}
          hint={copy.nameHint}
          error={errors.name}
          name="displayName"
          value={name}
          maxLength={120}
          autoComplete="off"
          autoFocus
          required
          onChange={(event) => setName(event.target.value)}
        />

        <fieldset className="fieldset sb-drafts">
          <legend>{copy.guestsLegend}</legend>
          <p className="help">{copy.guestsHint}</p>
          {guests.map((guest, index) => {
            const n = index + 1;
            const showContact =
              guest.showContact || guest.email.length > 0 || guest.phone.length > 0;
            return (
              <div key={guest.key} className="sb-draft">
                <div className="sb-draft-head">
                  <TextField
                    label={fill(copy.guestN, { n })}
                    error={errors[`guest-${guest.key}-name`]}
                    fieldClassName="sb-draft-name"
                    value={guest.name}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(event) => updateGuest(guest.key, { name: event.target.value })}
                  />
                  {guests.length > 1 ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={fill(copy.removeGuest, { n })}
                      onClick={() =>
                        setGuests((current) => current.filter((item) => item.key !== guest.key))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <div className="sb-draft-options">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={guest.isChild}
                      onChange={(event) =>
                        updateGuest(guest.key, { isChild: event.target.checked })
                      }
                    />
                    <span>{copy.guestChild}</span>
                  </label>
                  {!showContact ? (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => updateGuest(guest.key, { showContact: true })}
                    >
                      <Plus className="icon" aria-hidden="true" />
                      {copy.contactToggle}
                    </Button>
                  ) : null}
                </div>
                {showContact ? (
                  <div className="fields">
                    <TextField
                      label={copy.guestEmail}
                      optional={ui.optional}
                      error={errors[`guest-${guest.key}-email`]}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      maxLength={254}
                      value={guest.email}
                      onChange={(event) => updateGuest(guest.key, { email: event.target.value })}
                    />
                    <TextField
                      label={copy.guestPhone}
                      optional={ui.optional}
                      hint={copy.guestPhoneHint}
                      error={errors[`guest-${guest.key}-phone`]}
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      maxLength={20}
                      value={guest.phone}
                      onChange={(event) => updateGuest(guest.key, { phone: event.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          {guests.length < MAX_GUESTS ? (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                const key = nextKey.current;
                nextKey.current += 1;
                setGuests((current) => [...current, emptyGuest(key)]);
              }}
            >
              <Plus className="icon" aria-hidden="true" />
              {copy.addGuest}
            </Button>
          ) : null}
        </fieldset>

        <div className="fields">
          <TextField
            label={copy.seats}
            optional={ui.optional}
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
          failure.limit ? (
            <PlanLimitNotice
              limit={failure.limit.limit}
              used={failure.limit.used}
              copy={limitCopy}
              premiumCopy={premiumCopy}
              premium={premium}
            />
          ) : (
            <Notice tone="danger" role="alert">
              {failure.message}
            </Notice>
          )
        ) : null}

        <div className="dialog-footer">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {ui.cancel}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => submit(true)}>
            {copy.submitAddAnother}
          </Button>
          <Button type="submit" pending={pending} pendingLabel={copy.submittingAdd}>
            {copy.submitAdd}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
