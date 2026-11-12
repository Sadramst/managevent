"use client";

import { type ReactNode, useState } from "react";
import { signOut } from "@/lib/auth-client";

export interface SignOutButtonProps {
  /** Visible label, e.g. "Sign out". */
  label: string;
  /** Shown while the request runs, e.g. "Signing out". */
  pendingLabel: string;
  /** Shown if the request fails, so nobody walks away from a shared device still signed in. */
  failedLabel: string;
  className?: string | undefined;
  icon?: ReactNode;
  /** Where to go once signed out. Defaults to the home page. */
  redirectTo?: string | undefined;
}

/**
 * Signs the host out through the same-origin auth proxy, then does a full navigation so every
 * server component re-renders signed out.
 */
export function SignOutButton({
  label,
  pendingLabel,
  failedLabel,
  className = "menu-item",
  icon,
  redirectTo = "/",
}: SignOutButtonProps) {
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

  const onClick = async () => {
    setState("pending");
    const result = await signOut();
    if (result.ok) {
      window.location.assign(redirectTo);
      return;
    }
    setState("failed");
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={state === "pending"}
        aria-busy={state === "pending" || undefined}
      >
        {state === "pending" ? <span className="spinner" aria-hidden="true" /> : icon}
        {state === "pending" ? pendingLabel : label}
      </button>
      {state === "failed" ? (
        <p className="error menu-text" role="alert">
          {failedLabel}
        </p>
      ) : null}
    </>
  );
}
