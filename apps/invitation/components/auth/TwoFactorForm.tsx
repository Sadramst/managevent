"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import type { InvitationShellCopy } from "@managevent/i18n";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { type AuthErrorKey, verifyTwoFactor } from "@/lib/auth-client";

export interface TwoFactorFormProps {
  /** Where to go after signing in. Already checked by `safeNextPath` on the server. */
  next: string;
  copy: InvitationShellCopy["auth"];
}

/**
 * The second step of sign-in for accounts with two-step sign-in turned on: a 6-digit code from
 * the authenticator app, or one of the saved backup codes.
 */
export function TwoFactorForm({ next, copy }: TwoFactorFormProps) {
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthErrorKey | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const text = copy.twoFactor;
  const signInHref = next === "/studio" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const value = method === "totp" ? code.replace(/\s+/g, "") : code.trim();
    const valid = method === "totp" ? /^\d{6}$/.test(value) : value.length >= 4;
    if (!valid) {
      setFieldError(
        method === "totp" ? copy.validation.codeRequired : copy.validation.backupCodeRequired,
      );
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    setPending(true);
    const result = await verifyTwoFactor({ code: value, method });
    if (result.ok) {
      window.location.assign(next);
      return;
    }
    setPending(false);
    if (result.error === "invalidCode") {
      setFieldError(copy.errors.invalidCode);
      setCode("");
      inputRef.current?.focus();
    } else {
      setFormError(result.error);
    }
  };

  const switchMethod = () => {
    setMethod((current) => (current === "totp" ? "backup" : "totp"));
    setCode("");
    setFieldError(null);
    setFormError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      {formError ? (
        <div className="field">
          <Notice tone="danger" role="alert">
            <p>{copy.errors[formError]}</p>
            {formError === "twoFactorExpired" ? (
              <p>
                <Link className="link" href={signInHref}>
                  {text.startAgain}
                </Link>
              </p>
            ) : null}
          </Notice>
        </div>
      ) : null}
      <form onSubmit={onSubmit} noValidate aria-busy={pending}>
        {method === "totp" ? (
          <TextField
            ref={inputRef}
            key="totp"
            className="code-input"
            label={copy.fields.code}
            hint={text.lead}
            error={fieldError}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={7}
            required
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, ""))}
          />
        ) : (
          <TextField
            ref={inputRef}
            key="backup"
            label={copy.fields.backupCode}
            hint={text.backupLead}
            error={fieldError}
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        )}
        <Button type="submit" block pending={pending} pendingLabel={text.submitting}>
          {text.submit}
        </Button>
      </form>
      <p className="auth-alt">
        <button type="button" className="button button-ghost button-small" onClick={switchMethod}>
          {method === "totp" ? text.useBackup : text.useApp}
        </button>
      </p>
      <p className="small">
        <Link className="link" href={signInHref}>
          {text.startAgain}
        </Link>
      </p>
    </>
  );
}
