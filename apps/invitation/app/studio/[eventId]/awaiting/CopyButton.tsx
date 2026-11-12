"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label: string;
  ariaLabel: string;
  copiedLabel: string;
  failedLabel: string;
}

/** Plain button. Uses the Clipboard API only; no localStorage or sessionStorage. */
export function CopyButton({ text, label, ariaLabel, copiedLabel, failedLabel }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onCopy}
        aria-label={state === "copied" ? copiedLabel : ariaLabel}
        className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        {state === "copied" ? copiedLabel : label}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-stone-700">
        {state === "failed" ? failedLabel : ""}
      </span>
    </span>
  );
}
