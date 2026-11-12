"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import type { InvitationShellCopy } from "@managevent/i18n";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import {
  type AuthErrorKey,
  looksLikeEmail,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth-client";
import { PasswordField } from "./PasswordField";

type AuthCopy = InvitationShellCopy["auth"];

export interface ResetPasswordFormProps {
  /** The token from the emailed link. Without it the form asks for the email address. */
  token: string | null;
  /** True when the link was rejected before the form was shown (expired or already used). */
  linkInvalid: boolean;
  copy: AuthCopy;
}

/**
 * Password reset in two steps: ask for a reset link by email, then (arriving from that link
 * with a token) choose a new password. Rendered only when `capabilities.passwordReset` is true.
 */
export function ResetPasswordForm({ token, linkInvalid, copy }: ResetPasswordFormProps) {
  const text = copy.reset;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthErrorKey | null>(
    linkInvalid ? "invalidToken" : null,
  );
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const focusFirst = () => formRef.current?.querySelector<HTMLInputElement>("input")?.focus();

  const onRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const value = email.trim();
    if (value.length === 0 || !looksLikeEmail(value)) {
      setFieldError(
        value.length === 0 ? copy.validation.emailRequired : copy.validation.emailInvalid,
      );
      focusFirst();
      return;
    }
    setFieldError(null);
    setPending(true);
    const result = await requestPasswordReset({ email: value });
    setPending(false);
    if (result.ok) setSentTo(value);
    else setFormError(result.error);
  };

  const onReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !token) return;
    setFormError(null);
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      setFieldError(
        password.length === 0
          ? copy.validation.passwordRequired
          : password.length < PASSWORD_MIN_LENGTH
            ? copy.validation.passwordTooShort
            : copy.validation.passwordTooLong,
      );
      focusFirst();
      return;
    }
    setFieldError(null);
    setPending(true);
    const result = await resetPassword({ token, newPassword: password });
    setPending(false);
    if (result.ok) setDone(true);
    else setFormError(result.error);
  };

  if (done) {
    return (
      <>
        <Notice tone="success" role="status" title={text.doneTitle}>
          <p>{text.done}</p>
        </Notice>
        <p className="auth-alt">
          <Link className="link" href="/sign-in">
            {text.backToSignIn}
          </Link>
        </p>
      </>
    );
  }

  const showNewPassword = Boolean(token) && formError !== "invalidToken";

  return (
    <>
      {formError ? (
        <div className="field">
          <Notice tone="danger" role="alert">
            {copy.errors[formError]}
          </Notice>
        </div>
      ) : null}

      {showNewPassword ? (
        <form ref={formRef} onSubmit={onReset} noValidate aria-busy={pending}>
          <PasswordField
            id="reset-password"
            name="password"
            label={copy.fields.newPassword}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={copy.fields.passwordHint}
            error={fieldError}
            showStrength
            copy={{
              showPassword: copy.fields.showPassword,
              hidePassword: copy.fields.hidePassword,
              strengthLabel: copy.strength.label,
              tooShort: copy.strength.tooShort,
              fair: copy.strength.fair,
              good: copy.strength.good,
              strong: copy.strength.strong,
            }}
          />
          <Button type="submit" block pending={pending} pendingLabel={text.newSubmitting}>
            {text.newSubmit}
          </Button>
        </form>
      ) : sentTo ? (
        <Notice tone="success" role="status" title={text.requestSentTitle}>
          <p>{text.requestSent.replace("{email}", sentTo)}</p>
        </Notice>
      ) : (
        <form ref={formRef} onSubmit={onRequest} noValidate aria-busy={pending}>
          <TextField
            label={copy.fields.email}
            error={fieldError}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" block pending={pending} pendingLabel={text.requestSubmitting}>
            {text.requestSubmit}
          </Button>
        </form>
      )}

      <p className="auth-alt">
        <Link className="link" href="/sign-in">
          {text.backToSignIn}
        </Link>
      </p>
    </>
  );
}
