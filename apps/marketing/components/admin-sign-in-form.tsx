"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { AdminPagesCopy } from "@managevent/i18n";
import { confirmStaffSession } from "../app/admin/actions";

type SignInCopy = AdminPagesCopy["signIn"];
type ErrorKey =
  | "errorCredentials"
  | "errorCode"
  | "errorCodeExpired"
  | "errorRateLimited"
  | "errorNoSession"
  | "errorUnavailable";

interface AuthReply {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

/** Posts JSON to the same-origin auth proxy. A network failure reads as status 0. */
async function postAuth(path: string, payload: Record<string, unknown>): Promise<AuthReply> {
  try {
    const response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const parsed: unknown = await response.json().catch(() => null);
    const body =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: {} };
  }
}

/** Better Auth puts its error code at the top level; our API wraps it in `error`. */
function errorCodeOf(body: Record<string, unknown>): string {
  if (typeof body.code === "string") return body.code;
  const nested = body.error;
  if (typeof nested === "object" && nested !== null) {
    const code = (nested as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

/**
 * Staff sign-in: email and password, then the authenticator code. Both steps go through
 * `/api/auth/*` on this origin so the session cookie is set here. Once signed in, the server
 * confirms the account is staff; any other account is signed straight back out.
 *
 * There is no sign-up, magic link or password reset here: staff accounts are created by an
 * administrator.
 */
export function AdminSignInForm({
  copy,
  next,
  notice,
}: {
  copy: SignInCopy;
  /** Where to go once signed in. Already restricted to console paths by the server. */
  next: string;
  /** Why the visitor was sent here, if they were. */
  notice?: "staff" | "session" | "signed-out" | undefined;
}) {
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [staffOnly, setStaffOnly] = useState(notice === "staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // The submit button stays disabled until the form is interactive, so a fast click can never
  // submit the password as a plain form post.
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const startAgain = (message: ErrorKey | null = null) => {
    setStep("credentials");
    setCode("");
    setPassword("");
    setError(message);
    emailRef.current?.focus();
  };

  /** The browser now holds a session cookie: let the server say whether it is a staff one. */
  const finish = async () => {
    const check = await confirmStaffSession().catch(() => "no-session" as const);
    if (check === "staff") {
      // A full navigation, so the console renders from the new cookie.
      window.location.assign(next);
      return;
    }
    await postAuth("/sign-out", {});
    if (check === "not-staff") {
      setStaffOnly(true);
      startAgain();
    } else {
      startAgain("errorNoSession");
    }
    setPending(false);
  };

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setStaffOnly(false);
    if (email.trim() === "" || password === "") {
      setError("errorCredentials");
      return;
    }
    setPending(true);
    setError(null);
    const reply = await postAuth("/sign-in/email", {
      email: email.trim(),
      password,
      rememberMe: false,
    });
    if (reply.ok && reply.body.twoFactorRedirect === true) {
      setStep("code");
      setPending(false);
      return;
    }
    if (reply.ok) {
      await finish();
      return;
    }
    setPending(false);
    if (reply.status === 429) setError("errorRateLimited");
    else if (reply.status >= 400 && reply.status < 500) setError("errorCredentials");
    else setError("errorUnavailable");
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("errorCode");
      codeRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    const reply = await postAuth("/two-factor/verify-totp", { code: digits });
    if (reply.ok) {
      await finish();
      return;
    }
    setPending(false);
    if (reply.status === 429) {
      setError("errorRateLimited");
    } else if (reply.status === 0 || reply.status >= 500) {
      setError("errorUnavailable");
    } else if (/COOKIE|SESSION/.test(errorCodeOf(reply.body))) {
      // The short-lived pending sign-in ran out: the password step has to be repeated.
      startAgain("errorCodeExpired");
    } else {
      setError("errorCode");
      setCode("");
      codeRef.current?.focus();
    }
  };

  const status =
    !error && !staffOnly && step === "credentials"
      ? notice === "signed-out"
        ? copy.signedOut
        : notice === "session"
          ? copy.sessionEnded
          : null
      : null;

  return (
    <>
      {staffOnly ? (
        <div className="alert alert-warning" role="alert">
          <strong className="alert-title">{copy.staffOnly}</strong>
          <p>{copy.staffOnlyBody}</p>
        </div>
      ) : null}
      {status ? (
        <p className="alert" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="alert alert-danger" role="alert" id="sign-in-error">
          {copy[error]}
        </p>
      ) : null}
      <noscript>
        <p className="alert alert-warning">{copy.noScript}</p>
      </noscript>

      {step === "credentials" ? (
        <form method="post" onSubmit={submitCredentials} noValidate aria-busy={pending}>
          <div className="field">
            <label htmlFor="sign-in-email">{copy.email}</label>
            <input
              ref={emailRef}
              id="sign-in-email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              // Not `required`: a cleared box would be painted as invalid after a refusal.
              aria-required="true"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error === "errorCredentials" || undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="sign-in-password">{copy.password}</label>
            <input
              id="sign-in-password"
              name="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              aria-required="true"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error === "errorCredentials" || undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="button button-block"
              disabled={!ready || pending}
              aria-busy={pending}
            >
              {pending ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      ) : (
        <form method="post" onSubmit={submitCode} noValidate aria-busy={pending}>
          <h2 className="card-title">{copy.codeTitle}</h2>
          <p className="muted small">{copy.codeLead}</p>
          <div className="field">
            <label htmlFor="sign-in-code">{copy.code}</label>
            <input
              ref={codeRef}
              id="sign-in-code"
              name="code"
              className="console-code-input"
              type="text"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              aria-required="true"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, ""))}
              aria-invalid={error === "errorCode" || undefined}
              aria-describedby={error ? "sign-in-error sign-in-code-help" : "sign-in-code-help"}
            />
            <p className="help" id="sign-in-code-help">
              {copy.codeHelp}
            </p>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="button button-block"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? copy.verifying : copy.verify}
            </button>
            <button
              type="button"
              className="button button-ghost button-block"
              disabled={pending}
              onClick={() => startAgain()}
            >
              {copy.startAgain}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
