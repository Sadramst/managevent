"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface UnsavedGuardCopy {
  title: string;
  body: string;
  leave: string;
  stay: string;
}

export interface UnsavedGuardProps {
  /** True while the form holds changes that have not been saved. */
  dirty: boolean;
  copy: UnsavedGuardCopy;
}

/**
 * Stops a host losing unsaved work by accident.
 *
 * - Closing the tab, reloading or typing another address: the browser's own "leave site?"
 *   prompt (`beforeunload`).
 * - Following a link inside the app (a studio tab, the event switcher, the logo): a dialog asks
 *   first, then continues to where the link was going.
 *
 * Links that open in a new tab, downloads and modified clicks are left alone: they do not
 * unload the page. Nothing is attached while the form is clean.
 */
export function UnsavedGuard({ dirty, copy }: UnsavedGuardProps) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  /** Set once the host has chosen to leave, so the browser prompt does not ask again. */
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      // Older browsers need a value set to show the prompt.
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (leaving.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      const sameOrigin = url.origin === window.location.origin;
      const samePage =
        sameOrigin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (samePage) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(sameOrigin ? `${url.pathname}${url.search}${url.hash}` : url.href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <ConfirmDialog
      open={pendingHref !== null}
      title={copy.title}
      confirmLabel={copy.leave}
      cancelLabel={copy.stay}
      tone="danger"
      onCancel={() => setPendingHref(null)}
      onConfirm={() => {
        const href = pendingHref;
        setPendingHref(null);
        if (!href) return;
        leaving.current = true;
        if (href.startsWith("/")) router.push(href);
        else window.location.assign(href);
      }}
    >
      {copy.body}
    </ConfirmDialog>
  );
}
