"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./Button";
import { useUiCopy } from "./UiCopy";

/**
 * Copies text to the clipboard. `navigator.clipboard` is missing or blocked in some in-app
 * browsers (WhatsApp, Instagram) and on plain http, so there is a selection-based fallback.
 * Resolves false when neither worked; the caller then shows the text to copy by hand
 * (`ManualCopyField`).
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection fallback.
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

export interface ManualCopyFieldProps {
  /** The text that could not be copied. A guest link is a credential: never log it. */
  value: string;
  /** Why the field is here, e.g. "Could not copy. Select the text and copy it yourself." */
  message: string;
  /** Accessible name of the field. Defaults to the shared "Text to copy". */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * Shown when copying was refused: the text itself in a read-only field, focused and already
 * selected, so "copy it yourself" is one long-press or Ctrl+C away. Without it the message
 * would point at text that is nowhere on the page (a private link behind a button).
 */
export function ManualCopyField({ value, message, label, className }: ManualCopyFieldProps) {
  const { ui } = useUiCopy();
  const id = useId();
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const multiline = value.includes("\n") || value.length > 120;

  const selectAll = (element: HTMLInputElement | HTMLTextAreaElement) => {
    element.select();
    // iOS ignores `select()` on a read-only field; an explicit range works.
    element.setSelectionRange(0, element.value.length);
  };

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.focus();
    selectAll(element);
  }, [value]);

  const shared = {
    ref: field,
    id,
    readOnly: true,
    value,
    dir: "ltr" as const,
    spellCheck: false,
    autoComplete: "off",
    "aria-label": label ?? ui.copyManual,
    "aria-describedby": `${id}-why`,
    onFocus: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) =>
      selectAll(event.currentTarget),
  };

  return (
    <span className={className ? `copy-manual ${className}` : "copy-manual"}>
      <span className="error" id={`${id}-why`}>
        {message}
      </span>
      {multiline ? <textarea {...shared} rows={5} /> : <input {...shared} type="text" />}
    </span>
  );
}

export interface CopyButtonProps {
  /** The text to copy. A guest link is a credential: never log it. */
  value: string;
  /** Visible label, e.g. "Copy link". Defaults to the shared "Copy". */
  label?: string | undefined;
  /** Shown for two seconds after a successful copy. Defaults to the shared "Copied". */
  copiedLabel?: string | undefined;
  /** Shown when copying is not possible. Defaults to the shared message. */
  failedLabel?: string | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  block?: boolean | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  /** Called after a successful copy (for example to show a toast). */
  onCopied?: (() => void) | undefined;
}

/**
 * A button that copies `value` and confirms it, visibly and to screen readers. When the
 * browser refuses, the text appears beside the button, selected, to be copied by hand; it
 * stays until the next press.
 */
export function CopyButton({
  value,
  label: labelProp,
  copiedLabel: copiedProp,
  failedLabel: failedProp,
  variant = "secondary",
  size = "small",
  block,
  className,
  disabled,
  onCopied,
}: CopyButtonProps) {
  const { ui } = useUiCopy();
  const label = labelProp ?? ui.copy;
  const copiedLabel = copiedProp ?? ui.copied;
  const failedLabel = failedProp ?? ui.copyFailed;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = async () => {
    const copied = await copyText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setState(copied ? "copied" : "failed");
    if (copied) {
      onCopied?.();
      timer.current = setTimeout(() => setState("idle"), 2000);
    }
  };

  return (
    <>
      <button
        type="button"
        className={buttonClass({ variant, size, block }, className)}
        onClick={onClick}
        disabled={disabled}
      >
        {state === "copied" ? (
          <Check className="icon" aria-hidden="true" />
        ) : (
          <Copy className="icon" aria-hidden="true" />
        )}
        {state === "copied" ? copiedLabel : label}
      </button>
      {/* A failure is announced by the field below: focus moves to it, and it is described by
          the reason. */}
      <span className="sr-only" role="status">
        {state === "copied" ? copiedLabel : ""}
      </span>
      {state === "failed" ? <ManualCopyField value={value} message={failedLabel} /> : null}
    </>
  );
}
