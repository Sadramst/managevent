"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Dialog";
import { useUiCopy } from "./UiCopy";

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  /** What will happen, in plain words, including whether it can be undone. */
  children?: ReactNode;
  /** The action, as a verb: "Delete party", "Turn off link". */
  confirmLabel: string;
  /** Defaults to the shared "Cancel". */
  cancelLabel?: string | undefined;
  /** `danger` styles the confirm button as destructive. */
  tone?: "default" | "danger" | undefined;
  /** True while the action runs: shows a spinner and blocks dismissal. */
  pending?: boolean | undefined;
  pendingLabel?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for a destructive or hard-to-undo action. Cancel is the first button and gets
 * the initial focus, so a stray Enter never confirms.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "default",
  pending = false,
  pendingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { ui } = useUiCopy();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending} autoFocus>
            {cancelLabel ?? ui.cancel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            pending={pending}
            pendingLabel={pendingLabel}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof children === "string" ? <p>{children}</p> : children}
    </Modal>
  );
}
