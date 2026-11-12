"use client";

import { X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { cx } from "@managevent/ui/brand";
import { useUiCopy } from "./UiCopy";

export interface ModalProps {
  /** Controlled: the parent owns the open state. */
  open: boolean;
  /** Called for every way of closing: the close button, Escape, a press on the backdrop. */
  onClose: () => void;
  title: ReactNode;
  /** Accessible name of the close button. Defaults to the shared "Close". */
  closeLabel?: string | undefined;
  /** A sentence under the title, announced with the dialog. */
  description?: ReactNode;
  /** Buttons for the bottom row (`.dialog-footer`), secondary action first. */
  footer?: ReactNode;
  /** `drawer` slides a sheet in from the inline end; `modal` (default) is centred. */
  variant?: "modal" | "drawer" | undefined;
  /**
   * Set false while a request is in flight: Escape, the backdrop and the close button are
   * ignored so the dialog cannot vanish under a pending action.
   */
  dismissible?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * An accessible modal on the native `<dialog>` element (`.dialog`): focus is trapped and
 * restored by the browser, Escape closes it, and the page behind is inert.
 *
 * The content is mounted only while open, so a form inside starts fresh each time.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  description,
  footer,
  variant = "modal",
  dismissible = true,
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  /** What had focus when the dialog opened, so it can be given back. */
  const opener = useRef<HTMLElement | null>(null);
  const { ui } = useUiCopy();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    // `close()` hands focus back to the control that opened the dialog.
    if (!open && dialog.open) dialog.close();
    if (!open) opener.current = null;
  }, [open]);

  // Several dialogs are given a new `key` when they close, so their form starts fresh next
  // time. That removes an open <dialog> from the page without `close()`, and the browser then
  // drops focus on <body>. Hand it back to the opener here, as `close()` would have.
  useEffect(
    () => () => {
      const target = opener.current;
      if (!target) return;
      setTimeout(() => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost && target.isConnected) target.focus();
      }, 0);
    },
    [],
  );

  // The action row is docked to the bottom of the dialog, so a message that appears above it
  // after a submit (a refused save, a plan limit) could sit out of sight. Bring it into view.
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const alert = node.matches('[role="alert"]')
            ? node
            : node.querySelector<HTMLElement>('[role="alert"]');
          if (alert) {
            alert.scrollIntoView({ block: "nearest" });
            return;
          }
        }
      }
    });
    observer.observe(dialog, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open]);

  const isBackdrop = (event: MouseEvent<HTMLDialogElement>): boolean => {
    if (event.target !== ref.current) return false;
    const box = ref.current.getBoundingClientRect();
    return (
      event.clientX < box.x ||
      event.clientX > box.x + box.width ||
      event.clientY < box.y ||
      event.clientY > box.y + box.height
    );
  };

  return (
    <dialog
      ref={ref}
      className={cx("dialog", variant === "drawer" && "drawer", className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // `cancel` and `close` from a dialog nested inside this one reach these handlers too
        // (React delivers them to ancestors). Only this dialog's own events count, or closing a
        // confirmation inside a drawer would close the drawer with it.
        if (event.target !== event.currentTarget) return;
        // Escape. Always take over, so the open state stays in the parent.
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        if (open) onClose();
      }}
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = isBackdrop(event);
      }}
      onClick={(event) => {
        // Only a press that both starts and ends on the backdrop dismisses, so dragging a text
        // selection out of the dialog does not close it.
        if (dismissible && pressStartedOnBackdrop.current && isBackdrop(event)) onClose();
        pressStartedOnBackdrop.current = false;
      }}
    >
      {open ? (
        <>
          <div className="dialog-header">
            <div>
              <h2 className="dialog-title" id={titleId}>
                {title}
              </h2>
              {description ? (
                <p className="muted" id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={closeLabel ?? ui.close}
              disabled={!dismissible}
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          {children}
          {footer ? <div className="dialog-footer">{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}

/** A side sheet for longer forms: `Modal` with `variant="drawer"`. */
export function Drawer(props: Omit<ModalProps, "variant">) {
  return <Modal {...props} variant="drawer" />;
}
