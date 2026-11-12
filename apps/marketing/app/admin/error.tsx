"use client";

import { getAdminPages } from "@managevent/i18n";

/**
 * Shown when a console page fails to load (for example the API is unreachable). It says so
 * plainly and offers a retry; error details stay on the server.
 */
export default function ConsoleError({ reset }: { error: Error; reset: () => void }) {
  const copy = getAdminPages("en").problem;
  return (
    <main id="main" className="wrap console-auth">
      <div className="console-auth-inner">
        <div className="alert alert-danger" role="alert">
          <strong className="alert-title">{copy.title}</strong>
          <p>{copy.body}</p>
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={() => reset()}>
            {copy.retry}
          </button>
          <a className="button button-secondary" href="/admin">
            {copy.backToInbox}
          </a>
        </div>
      </div>
    </main>
  );
}
