import { getAdminPages } from "@managevent/i18n";

/**
 * A missing page inside the console (an unknown enquiry id or address). It renders inside the
 * console layout, so only signed-in staff ever see it. The `<title>` is rendered here because a
 * not-found page takes no metadata from the route that threw.
 */
export default function ConsoleNotFound() {
  const copy = getAdminPages("en");
  return (
    <main id="main" className="wrap console-main">
      <title>{`${copy.problem.notFoundTitle} | ${copy.shell.titleSuffix}`}</title>
      <header className="page-header">
        <div>
          <p className="eyebrow">{copy.shell.productLabel}</p>
          <h1 className="page-title">{copy.problem.notFoundTitle}</h1>
        </div>
      </header>
      <div className="empty">
        <p className="empty-body">{copy.problem.notFoundBody}</p>
        <a className="button button-secondary button-small" href="/admin">
          {copy.problem.backToInbox}
        </a>
      </div>
    </main>
  );
}
