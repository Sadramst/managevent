import { isApiError } from "@managevent/api-client";
import { fillCopy, getAdminPages } from "@managevent/i18n";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminInboxTable } from "../../../components/admin-inbox-table";
import { loadCeremonyNames } from "../../../lib/admin/ceremonies";
import {
  inboxHref,
  LEAD_STAGES,
  parseLeadCursor,
  parseSearchQuery,
  parseStageFilter,
  SEARCH_MAX_LENGTH,
  signInHref,
  stageCounts,
  toInboxRow,
} from "../../../lib/admin/leads";
import { getServerApi, requireStaff } from "../../../lib/admin/server";

const copy = getAdminPages("en");
const PAGE_SIZE = 50;
/** The API's largest page. Stage totals are exact only while every enquiry fits in one. */
const COUNT_PAGE_SIZE = 100;

export const metadata: Metadata = { title: copy.inbox.metaTitle };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const query = await searchParams;
  const stage = parseStageFilter(query.stage);
  const q = parseSearchQuery(query.q);
  const cursor = parseLeadCursor(query.cursor);
  const here = inboxHref({ stage, q, cursor });

  const api = await getServerApi();
  let page: Awaited<ReturnType<typeof api.leads.list>>;
  let countPage: Awaited<ReturnType<typeof api.leads.list>> | null;
  try {
    [page, countPage] = await Promise.all([
      api.leads.list({ stage, q, cursor, limit: PAGE_SIZE }),
      // Totals for the tabs: one unfiltered page. A failure only costs the numbers.
      api.leads.list({ q, limit: COUNT_PAGE_SIZE }).catch(() => null),
    ]);
  } catch (err) {
    // The session ended, or the role was removed, between the session check and this call.
    if (isApiError(err, "UNAUTHENTICATED")) redirect(signInHref({ reason: "session", next: here }));
    if (isApiError(err, "FORBIDDEN")) redirect(signInHref({ reason: "staff" }));
    throw err;
  }

  const counts = stageCounts(countPage);
  const names = loadCeremonyNames();
  const rows = page.items.map((lead) => toInboxRow(lead, copy, names));
  const filtered = Boolean(stage || q || cursor);
  const tabs = [
    {
      key: "all",
      label: copy.inbox.all,
      href: inboxHref({ q }),
      current: !stage,
      count: counts?.all,
    },
    ...LEAD_STAGES.map((value) => ({
      key: value,
      label: copy.stages[value],
      href: inboxHref({ stage: value, q }),
      current: stage === value,
      count: counts?.[value],
    })),
  ];

  return (
    <main id="main" className="wrap console-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">{copy.inbox.eyebrow}</p>
          <h1 className="page-title">{copy.inbox.title}</h1>
          <p className="console-header-lead">{copy.inbox.lead}</p>
        </div>
      </header>

      <nav className="tabs" aria-label={copy.inbox.tabsLabel}>
        {tabs.map((tab) => (
          <a
            key={tab.key}
            className="tab"
            href={tab.href}
            aria-current={tab.current ? "page" : undefined}
            data-stage={tab.key}
          >
            {tab.label}
            {tab.count === undefined ? null : (
              <span className="console-count" data-testid={`count-${tab.key}`}>
                {tab.count}
              </span>
            )}
          </a>
        ))}
      </nav>

      <form className="console-search" method="get" action="/admin" role="search">
        {stage ? <input type="hidden" name="stage" value={stage} /> : null}
        <div className="field">
          <label htmlFor="inbox-search">{copy.inbox.searchLabel}</label>
          <div className="console-search-row">
            <input
              id="inbox-search"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              maxLength={SEARCH_MAX_LENGTH}
              autoComplete="off"
              aria-describedby="inbox-search-help"
            />
            <button type="submit" className="button button-secondary">
              {copy.inbox.searchSubmit}
            </button>
          </div>
          <p className="help" id="inbox-search-help">
            {copy.inbox.searchHelp}
          </p>
        </div>
      </form>

      {q ? (
        <p className="console-note">
          {fillCopy(copy.inbox.searchActive, { query: q })}{" "}
          <a className="link" href={inboxHref({ stage })}>
            {copy.inbox.searchClear}
          </a>
        </p>
      ) : null}
      {cursor ? (
        <p className="console-note">
          {copy.inbox.olderPage}{" "}
          <a className="link" href={inboxHref({ stage, q })}>
            {copy.inbox.backToNewest}
          </a>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty" data-testid="inbox-empty">
          <h2 className="empty-title">
            {filtered ? copy.inbox.emptyFilteredTitle : copy.inbox.emptyTitle}
          </h2>
          <p className="empty-body">
            {filtered ? copy.inbox.emptyFilteredBody : copy.inbox.emptyBody}
          </p>
          {filtered ? (
            <a className="button button-secondary button-small" href="/admin">
              {copy.inbox.emptyFilteredAction}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <AdminInboxTable
            // A new filter is a new list: never carry appended rows across it.
            key={here}
            copy={{
              caption: copy.inbox.tableCaption,
              colReceived: copy.inbox.colReceived,
              colName: copy.inbox.colName,
              colCeremony: copy.inbox.colCeremony,
              colEventDate: copy.inbox.colEventDate,
              colGuests: copy.inbox.colGuests,
              colArea: copy.inbox.colArea,
              colStage: copy.inbox.colStage,
              dateFlexible: copy.inbox.dateFlexible,
              memorial: copy.inbox.memorial,
              notGiven: copy.inbox.notGiven,
              loadMore: copy.inbox.loadMore,
              loadingMore: copy.inbox.loadingMore,
              loadMoreFailed: copy.inbox.loadMoreFailed,
              shown: copy.inbox.shown,
            }}
            initialRows={rows}
            initialNextCursor={page.nextCursor}
            nextHref={page.nextCursor ? inboxHref({ stage, q, cursor: page.nextCursor }) : null}
            filter={{ stage, q }}
          />
          <p className="notice">{copy.inbox.timeZoneNote}</p>
        </>
      )}
    </main>
  );
}
