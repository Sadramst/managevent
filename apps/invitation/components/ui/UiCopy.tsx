"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { InvitationShellCopy } from "@managevent/i18n";

/** The small set of generic labels every primitive needs ("Close", "Cancel", "Copied" ...). */
export interface UiCopy {
  ui: InvitationShellCopy["ui"];
  errorPage: InvitationShellCopy["errorPage"];
  /** Shown when a request never reached the server (`errors.NETWORK_ERROR`); see `useSettle`. */
  networkError: string;
}

const UiCopyContext = createContext<UiCopy | null>(null);

/**
 * Mounted once in the root layout with copy from `packages/i18n`, so client primitives
 * (`Modal`, `ConfirmDialog`, `CopyButton`, toasts, error pages) have their generic labels
 * without importing the i18n package into the browser bundle. A label passed as a prop to a
 * primitive always wins over this default.
 */
export function UiCopyProvider({ value, children }: { value: UiCopy; children: ReactNode }) {
  return <UiCopyContext.Provider value={value}>{children}</UiCopyContext.Provider>;
}

/** The generic UI labels. Throws outside the root layout (a wiring mistake, not a user error). */
export function useUiCopy(): UiCopy {
  const copy = useContext(UiCopyContext);
  if (!copy) throw new Error("useUiCopy must be used under UiCopyProvider (app/layout.tsx)");
  return copy;
}
