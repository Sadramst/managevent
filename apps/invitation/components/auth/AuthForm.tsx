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
  requestMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/auth-client";
import { PasswordField } from "./PasswordField";

type AuthCopy = InvitationShellCopy["auth"];

export interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  /** Where to go after signing in. Already checked by `safeNextPath` on the server. */
  next: string;
  /** From `GET /v1/me`: only offer what this deployment can actually do. */
  capabilities: { magicLink: boolean; passwordReset: boolean };
  /** `getInvitationShell(locale).auth`, passed from the server page. */
  copy: AuthCopy;
  /** Absolute www URLs for the terms and privacy policy (sign-up acknowledgement). */
  legal: { terms: string; privacy: string };
  /** A problem to show before anything is typed, for example an emailed link that failed. */
  initialError?: AuthErrorKey | undefined;
}

type FieldName = "name" | "email" | "password";
type Errors = Partial<Record<FieldName, string>>;

function withNext(path: string, next: string): string {
  return next === "/studio" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

/** Splits "By creating ... our {terms} and {privacy}." into text and the two links. */
function Acknowledgement({ copy, legal }: { copy: AuthCopy; legal: AuthFormProps["legal"] }) {
  const parts = copy.signUp.acknowledgement.split(/(\{terms\}|\{privacy\})/);
  return (
    <p className="auth-legal">
      {parts.map((part, index) =>
        part === "{terms}" ? (
          <a key={index} className="link" href={legal.terms} rel="noopener">
            {copy.signUp.termsLink}
          </a>
        ) : part === "{privacy}" ? (
          <a key={index} className="link" href={legal.privacy} rel="noopener">
            {copy.signUp.privacyLink}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/**
 * The sign-in and sign-up form. It talks to the same-origin auth proxy, so a success sets the
 * session cookie in this browser; it then does a full navigation to `next`.
 *
 * Validation runs on submit, with a message under each field and focus moved to the first
 * problem. What was typed is kept on every kind of failure.
 */
export function AuthForm({ mode, next, capabilities, copy, legal, initialError }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const text = isSignUp ? copy.signUp : copy.signIn;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<AuthErrorKey | null>(initialError ?? null);
  const [pending, setPending] = useState<"password" | "magic" | null>(null);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const focusField = (field: FieldName) => {
    formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
  };

  const validate = (fields: readonly FieldName[]): Errors => {
    const found: Errors = {};
    const v = copy.validation;
    if (fields.includes("name") && name.trim().length === 0) found.name = v.nameRequired;
    if (fields.includes("email")) {
      if (email.trim().length === 0) found.email = v.emailRequired;
      else if (!looksLikeEmail(email)) found.email = v.emailInvalid;
    }
    if (fields.includes("password")) {
      if (password.length === 0) found.password = v.passwordRequired;
      else if (isSignUp && password.length < PASSWORD_MIN_LENGTH)
        found.password = v.passwordTooShort;
      else if (password.length > PASSWORD_MAX_LENGTH) found.password = v.passwordTooLong;
    }
    return found;
  };

  const showFailure = (error: AuthErrorKey) => {
    // Problems that belong to one field are shown on it; the rest go in the summary.
    if (error === "accountExists" || error === "invalidEmail") {
      setErrors({ email: copy.errors[error] });
      focusField("email");
      return;
    }
    if (error === "passwordTooShort" || error === "passwordTooLong") {
      setErrors({ password: copy.errors[error] });
      focusField("password");
      return;
    }
    setFormError(error);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    setMagicSentTo(null);
    const found = validate(isSignUp ? ["name", "email", "password"] : ["email", "password"]);
    setErrors(found);
    const first = (["name", "email", "password"] as const).find((field) => found[field]);
    if (first) {
      focusField(first);
      return;
    }

    setPending("password");
    const trimmedEmail = email.trim();
    if (isSignUp) {
      const result = await signUpWithPassword({ name: name.trim(), email: trimmedEmail, password });
      if (result.ok) {
        window.location.assign(next);
        return;
      }
      setPending(null);
      showFailure(result.error);
      return;
    }

    const result = await signInWithPassword({ email: trimmedEmail, password, rememberMe });
    if (result.ok) {
      window.location.assign(
        result.data.twoFactorRedirect ? withNext("/sign-in/two-factor", next) : next,
      );
      return;
    }
    setPending(null);
    showFailure(result.error);
  };

  const onMagicLink = async () => {
    if (pending) return;
    setFormError(null);
    setMagicSentTo(null);
    const found = validate(["email"]);
    setErrors(found);
    if (found.email) {
      focusField("email");
      return;
    }
    setPending("magic");
    const result = await requestMagicLink({ email: email.trim(), callbackPath: next });
    setPending(null);
    if (result.ok) setMagicSentTo(email.trim());
    else showFailure(result.error);
  };

  return (
    <>
      <noscript>
        <Notice tone="warning">{copy.noscript}</Notice>
      </noscript>

      {formError ? (
        <div ref={summaryRef} tabIndex={-1} className="error-summary field">
          <Notice tone="danger" role="alert">
            <p>{copy.errors[formError]}</p>
            {formError === "invalidCredentials" && capabilities.passwordReset ? (
              <p>
                <Link className="link" href="/reset-password">
                  {copy.signIn.forgot}
                </Link>
              </p>
            ) : null}
          </Notice>
        </div>
      ) : null}

      <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={pending !== null}>
        {isSignUp ? (
          <TextField
            label={copy.fields.name}
            hint={copy.fields.nameHint}
            error={errors.name}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}
        <TextField
          label={copy.fields.email}
          error={errors.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete={isSignUp ? "email" : "username"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          id={`${mode}-password`}
          name="password"
          label={copy.fields.password}
          value={password}
          onChange={setPassword}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          hint={isSignUp ? copy.fields.passwordHint : undefined}
          error={errors.password}
          showStrength={isSignUp}
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

        {!isSignUp ? (
          <div className="auth-row">
            <label className="check">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>{copy.signIn.rememberMe}</span>
            </label>
            {capabilities.passwordReset ? (
              <Link className="link" href="/reset-password">
                {copy.signIn.forgot}
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          block
          pending={pending === "password"}
          pendingLabel={text.submitting}
          disabled={pending === "magic"}
        >
          {text.submit}
        </Button>

        {isSignUp ? <Acknowledgement copy={copy} legal={legal} /> : null}
      </form>

      {!isSignUp && capabilities.magicLink ? (
        <section aria-labelledby="magic-link-title">
          <p className="auth-divider">{copy.signIn.magicDivider}</p>
          <h3 id="magic-link-title" className="card-title">
            {copy.signIn.magicTitle}
          </h3>
          <p className="muted small">{copy.signIn.magicBody}</p>
          {magicSentTo ? (
            <Notice tone="success" role="status" title={copy.signIn.magicSentTitle}>
              <p>{copy.signIn.magicSent.replace("{email}", magicSentTo)}</p>
            </Notice>
          ) : (
            <Button
              variant="secondary"
              block
              onClick={onMagicLink}
              pending={pending === "magic"}
              pendingLabel={copy.signIn.magicSending}
              disabled={pending === "password"}
            >
              {copy.signIn.magicSubmit}
            </Button>
          )}
        </section>
      ) : null}

      <p className="auth-alt">
        {text.switchPrompt}{" "}
        <Link className="link" href={withNext(isSignUp ? "/sign-in" : "/sign-up", next)}>
          {text.switchAction}
        </Link>
      </p>
    </>
  );
}
