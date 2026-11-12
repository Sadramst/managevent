"use client";

import { useEffect } from "react";
import { Notice } from "@/components/ui/Notice";
import { useUiCopy } from "@/components/ui/UiCopy";

export interface ErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Render a `<main>` landmark. False inside the studio, whose shell already has one. */
  withMain?: boolean | undefined;
}

/**
 * What a person sees when a page throws while rendering. Plain words, a retry, and a way home.
 * Only the digest is logged in the browser: error messages can carry guest details.
 */
export function ErrorScreen({ error, reset, withMain = true }: ErrorScreenProps) {
  const { errorPage } = useUiCopy();

  useEffect(() => {
    if (error.digest) console.error(`[page] render failed digest=${error.digest}`);
  }, [error.digest]);

  const body = (
    <div className="wrap wrap-narrow section">
      <Notice tone="danger" role="alert" title={errorPage.title}>
        <p>{errorPage.body}</p>
        <div className="form-actions">
          <button type="button" className="button" onClick={reset}>
            {errorPage.retry}
          </button>
          <a className="button button-secondary" href="/">
            {errorPage.home}
          </a>
        </div>
      </Notice>
    </div>
  );

  return withMain ? (
    <main id="main" tabIndex={-1}>
      {body}
    </main>
  ) : (
    body
  );
}
