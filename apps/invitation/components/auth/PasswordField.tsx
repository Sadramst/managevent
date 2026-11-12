"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Field, type FieldError, fieldControlProps } from "@/components/ui/Field";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordStrength } from "@/lib/auth-client";

export interface PasswordFieldCopy {
  showPassword: string;
  hidePassword: string;
  strengthLabel: string;
  /** Contains `{remaining}`. */
  tooShort: string;
  fair: string;
  good: string;
  strong: string;
}

export interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `current-password` on sign-in; `new-password` on sign-up and reset. */
  autoComplete: "current-password" | "new-password";
  copy: PasswordFieldCopy;
  hint?: string | undefined;
  error?: FieldError;
  /** Shows the strength meter (sign-up and reset only). */
  showStrength?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * A password input with a show/hide toggle and, for new passwords, a strength hint that is
 * text first (never colour alone) and announced politely as it changes.
 */
export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  copy,
  hint,
  error,
  showStrength = false,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const score = passwordStrength(value);
  const strengthText =
    value.length === 0
      ? ""
      : score === 0
        ? copy.tooShort.replace("{remaining}", String(PASSWORD_MIN_LENGTH - value.length))
        : score === 1
          ? copy.fair
          : score === 2
            ? copy.good
            : copy.strong;
  // One bar as soon as typing starts, then one more per strength step.
  const bars = value.length === 0 ? 0 : score + 1;

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="field-row">
        <input
          {...fieldControlProps(id, { hint, error })}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="button button-secondary"
          aria-label={visible ? copy.hidePassword : copy.showPassword}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="icon" aria-hidden="true" />
          ) : (
            <Eye className="icon" aria-hidden="true" />
          )}
        </button>
      </div>
      {showStrength ? (
        <p className="strength" role="status">
          <span className="strength-bars" aria-hidden="true">
            {[1, 2, 3, 4].map((bar) => (
              <span key={bar} data-on={bar <= bars} />
            ))}
          </span>
          {strengthText ? (
            <span>
              <span className="sr-only">{copy.strengthLabel}: </span>
              {strengthText}
            </span>
          ) : null}
        </p>
      ) : null}
    </Field>
  );
}
