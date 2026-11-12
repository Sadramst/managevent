"use client";

import type { InvitationGuestCopy, InvitationGuestVoice } from "@managevent/i18n";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { submitWishAction } from "@/lib/guest/actions";
import type { GuestLink } from "@/lib/guest/paths";
import { newIdempotencyKey } from "./model";

const MAX_NAME = 80;
const MAX_MESSAGE = 1000;

export interface WishFormProps {
  link: GuestLink;
  /** Sample and preview invitations show the form but send nothing. */
  readOnly: boolean;
  /** A starting value for the name, e.g. the household name on the invitation. */
  defaultName: string;
  voice: InvitationGuestVoice;
  copy: InvitationGuestCopy["well"];
  nameRequired: string;
  messageRequired: string;
}

/**
 * A message for the wishing well, or a tribute for the tribute book. It goes to the hosts; it
 * is shown to other guests only if the guest ticks the box and the hosts then approve it.
 */
export function WishForm({
  link,
  readOnly,
  defaultName,
  voice,
  copy,
  nameRequired,
  messageRequired,
}: WishFormProps) {
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<{ shared: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const thanks = useRef<HTMLDivElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || readOnly) return;
    setFailure(null);

    const input = { authorName: name.trim(), message: message.trim(), shareOnWall: share };
    const problems = {
      ...(input.authorName ? {} : { name: nameRequired }),
      ...(input.message ? {} : { message: messageRequired }),
    };
    setErrors(problems);
    if (problems.name) {
      document.getElementById("wish-name")?.focus();
      return;
    }
    if (problems.message) {
      document.getElementById("wish-message")?.focus();
      return;
    }

    const body = JSON.stringify(input);
    if (!attempt.current || attempt.current.body !== body) {
      attempt.current = { key: newIdempotencyKey(), body };
    }

    setPending(true);
    try {
      const result = await submitWishAction(
        link.eventSlug,
        link.guestToken,
        input,
        attempt.current.key,
      );
      if (result.ok) {
        attempt.current = null;
        setSent({ shared: result.data.shared });
        setMessage("");
        setShare(false);
        requestAnimationFrame(() => thanks.current?.focus());
        return;
      }
      setFailure(
        result.code === "RATE_LIMITED"
          ? copy.errors.limit
          : result.code === "CONFLICT"
            ? copy.errors.off
            : ["UNKNOWN", "NETWORK_ERROR", "INTERNAL_ERROR"].includes(result.code)
              ? copy.errors.generic
              : result.message,
      );
    } catch {
      setFailure(copy.errors.generic);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div ref={thanks} tabIndex={-1} className="inv-confirm" role="status">
        <p>{sent.shared ? voice.wishSentShared : voice.wishSent}</p>
        <Button variant="ghost" size="small" onClick={() => setSent(null)}>
          {copy.another}
        </Button>
      </div>
    );
  }

  return (
    <form className="inv-form inv-wish-form" onSubmit={onSubmit} noValidate>
      <h3>{voice.wishFormTitle}</h3>
      {readOnly ? <Notice tone="info">{copy.readOnly}</Notice> : null}
      <TextField
        id="wish-name"
        label={copy.nameLabel}
        error={errors.name}
        value={name}
        maxLength={MAX_NAME}
        autoComplete="name"
        onChange={(event) => {
          setName(event.target.value);
          if (errors.name) setErrors(({ message: kept }) => (kept ? { message: kept } : {}));
        }}
      />
      <TextAreaField
        id="wish-message"
        label={voice.wishMessageLabel}
        error={errors.message}
        rows={4}
        value={message}
        maxLength={MAX_MESSAGE}
        onChange={(event) => {
          setMessage(event.target.value);
          if (errors.message) setErrors(({ name: kept }) => (kept ? { name: kept } : {}));
        }}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => setShare(event.target.checked)}
        />
        <span>{voice.wishShare}</span>
      </label>
      {failure ? (
        <Notice tone="danger" role="alert">
          {failure}
        </Notice>
      ) : null}
      <div className="form-actions">
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel={copy.sending}
          disabled={readOnly}
        >
          {voice.wishSubmit}
        </Button>
      </div>
    </form>
  );
}
