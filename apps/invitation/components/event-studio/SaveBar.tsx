"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export interface SaveBarProps {
  /** True while there are changes to save. */
  dirty: boolean;
  pending: boolean;
  /** Blocks saving while something on the page stops it (a Premium option in the preview). */
  saveDisabled?: boolean | undefined;
  onSave: () => void;
  onDiscard: () => void;
  labels: {
    unsaved: string;
    saved: string;
    save: string;
    saving: string;
    discard: string;
  };
  /** Why saving is blocked, shown in place of "Unsaved changes" (e.g. a Premium option). */
  blockedNote?: string | undefined;
  /** Extra controls at the start of the bar, e.g. a "Preview" button on a phone. */
  children?: ReactNode;
}

/**
 * The save bar of an editor: sticks to the bottom of the window, says whether there are
 * unsaved changes, and holds the one Save button. The status is a live region, so a screen
 * reader hears "Unsaved changes" and "All changes saved" without the focus moving.
 */
export function SaveBar({
  dirty,
  pending,
  saveDisabled,
  onSave,
  onDiscard,
  labels,
  blockedNote,
  children,
}: SaveBarProps) {
  return (
    <div className="es-savebar" data-dirty={dirty ? true : undefined}>
      <div className="wrap es-savebar-inner">
        <p className="es-savebar-status" role="status">
          <span className="es-savebar-dot" aria-hidden="true" />
          {dirty ? (blockedNote ?? labels.unsaved) : labels.saved}
        </p>
        <div className="es-savebar-actions">
          {children}
          {dirty ? (
            <Button variant="ghost" onClick={onDiscard} disabled={pending}>
              {labels.discard}
            </Button>
          ) : null}
          <Button
            className="es-savebar-save"
            onClick={onSave}
            disabled={!dirty || saveDisabled}
            pending={pending}
            pendingLabel={labels.saving}
          >
            {labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
