"use client";

import { useEffect, useState, useTransition } from "react";
import { loadMoreLeads } from "../app/admin/actions";
import type { InboxRow } from "../lib/admin/leads";

export interface InboxTableCopy {
  caption: string;
  colReceived: string;
  colName: string;
  colCeremony: string;
  colEventDate: string;
  colGuests: string;
  colArea: string;
  colStage: string;
  dateFlexible: string;
  memorial: string;
  notGiven: string;
  loadMore: string;
  loadingMore: string;
  loadMoreFailed: string;
  /** `{count} shown` */
  shown: string;
}

function Value({ text, empty }: { text: string; empty: string }) {
  return text ? <>{text}</> : <span className="console-empty-value">{empty}</span>;
}

/**
 * The enquiries table. The server renders the first page; "Load more" appends the next one
 * through a server action. Without JavaScript the same control is a link to the next page.
 *
 * Under 680px the rows are laid out as cards (see `admin.css`), so the table roles are stated
 * explicitly: changing `display` would otherwise drop them for assistive technology.
 */
export function AdminInboxTable({
  copy,
  initialRows,
  initialNextCursor,
  nextHref,
  filter,
}: {
  copy: InboxTableCopy;
  initialRows: readonly InboxRow[];
  initialNextCursor: string | null;
  /** The no-JavaScript link to the next page, when there is one. */
  nextHref: string | null;
  filter: { stage?: string | undefined; q?: string | undefined };
}) {
  const [rows, setRows] = useState<readonly InboxRow[]>(initialRows);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  // Before the page is interactive (and without JavaScript) "Load more" is a link to the next
  // page; afterwards it is a button that appends rows in place.
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);

  const loadMore = () => {
    if (pending || !nextCursor) return;
    const cursor = nextCursor;
    setFailed(false);
    startTransition(async () => {
      const result = await loadMoreLeads({
        ...(filter.stage ? { stage: filter.stage } : {}),
        ...(filter.q ? { q: filter.q } : {}),
        cursor,
      }).catch(() => null);
      if (!result?.ok) {
        setFailed(true);
        return;
      }
      setRows((current) => {
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...result.data.rows.filter((row) => !seen.has(row.id))];
      });
      setNextCursor(result.data.nextCursor);
    });
  };

  return (
    <>
      <div className="table-wrap console-inbox-wrap">
        <table className="table console-inbox" role="table">
          <caption className="sr-only">{copy.caption}</caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                {copy.colReceived}
              </th>
              <th scope="col" role="columnheader">
                {copy.colName}
              </th>
              <th scope="col" role="columnheader">
                {copy.colCeremony}
              </th>
              <th scope="col" role="columnheader">
                {copy.colEventDate}
              </th>
              <th scope="col" role="columnheader" className="cell-num">
                {copy.colGuests}
              </th>
              <th scope="col" role="columnheader">
                {copy.colArea}
              </th>
              <th scope="col" role="columnheader">
                {copy.colStage}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((row) => (
              <tr key={row.id} role="row" data-lead-id={row.id}>
                <td role="cell" data-cell="received" data-label={copy.colReceived} className="num">
                  <time dateTime={row.receivedIso}>{row.received}</time>
                </td>
                <th scope="row" role="rowheader" data-cell="name">
                  <a className="console-row-link" href={row.href}>
                    {row.name}
                  </a>
                  <span className="cell-sub" dir="ltr">
                    {row.email}
                  </span>
                </th>
                <td role="cell" data-cell="ceremony" data-label={copy.colCeremony}>
                  <span>
                    <Value text={row.ceremony} empty={copy.notGiven} />
                    {row.memorial ? <span className="pill">{copy.memorial}</span> : null}
                  </span>
                </td>
                <td role="cell" data-cell="event-date" data-label={copy.colEventDate}>
                  <span className="num">
                    {row.eventDate ? (
                      row.eventDate
                    ) : row.dateFlexible ? (
                      copy.dateFlexible
                    ) : (
                      <span className="console-empty-value">{copy.notGiven}</span>
                    )}
                    {row.eventDate && row.dateFlexible ? (
                      <span className="cell-sub">{copy.dateFlexible}</span>
                    ) : null}
                  </span>
                </td>
                <td role="cell" data-cell="guests" data-label={copy.colGuests} className="cell-num">
                  <Value text={row.guests} empty={copy.notGiven} />
                </td>
                <td role="cell" data-cell="area" data-label={copy.colArea}>
                  <Value text={row.area} empty={copy.notGiven} />
                </td>
                <td role="cell" data-cell="stage" data-label={copy.colStage}>
                  <span className={row.stageClass}>{row.stageLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="console-inbox-footer">
        <p className="notice" role="status">
          {copy.shown.replace("{count}", String(rows.length))}
        </p>
        {nextCursor && interactive ? (
          <button
            type="button"
            className="button button-secondary"
            aria-busy={pending}
            disabled={pending}
            onClick={loadMore}
          >
            {pending ? copy.loadingMore : copy.loadMore}
          </button>
        ) : null}
        {nextHref && !interactive ? (
          <a className="button button-secondary" href={nextHref}>
            {copy.loadMore}
          </a>
        ) : null}
      </div>
      {failed ? (
        <p className="error" role="alert">
          {copy.loadMoreFailed}
        </p>
      ) : null}
    </>
  );
}
