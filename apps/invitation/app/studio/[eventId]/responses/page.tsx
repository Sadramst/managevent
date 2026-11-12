import { DoorOpen, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { isApiError } from "@managevent/api-client";
import { fillCopy, getInvitationStudioGuests } from "@managevent/i18n";
import { StatusBadge } from "@/components/guest-list/StatusBadge";
import { DietarySection } from "@/components/responses/DietarySection";
import { ResponsesNav } from "@/components/responses/ResponsesNav";
import { WishQueue, type WishView } from "@/components/responses/WishQueue";
import { Badge, buttonClass, EmptyState, Notice, Stats, StatTile } from "@/components/ui";
import { deadlineText } from "@/lib/guest-list/deadline";
import { experienceModeAttr, isMemorial, loadEvent } from "@/lib/guest-list/event";
import { formatInstantShort } from "@/lib/guest-list/instants";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const copy = getInvitationStudioGuests("en");

export const metadata: Metadata = privateMetadata(copy.responses.metaTitle);

/** A section the host may not see (`403`) is hidden rather than failing the page. */
async function orNullIfForbidden<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (isApiError(err) && err.status === 403) return null;
    throw err;
  }
}

const MODERATION_ORDER = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;

export default async function EventResponsesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireHost();
  const api = await getServerApi();
  const event = await loadEvent(api, eventId);
  const [summary, dietary, wishes, plan] = await Promise.all([
    api.responses.getSummary(eventId),
    orNullIfForbidden(api.responses.getDietary(eventId)),
    orNullIfForbidden(api.well.list(eventId)),
    api.billing.getPlan(eventId),
  ]);

  const memorial = isMemorial(event);
  const { responses, common } = copy;
  const { totals, deadline } = summary;
  const attending = totals.adultsYes + totals.childrenYes;
  const showMaybe = event.invitation.rsvpConfig.allowMaybe || totals.maybe > 0;
  const canCheckIn = plan.entitlements.qrPassesAndCheckin;
  const showCheckedIn = canCheckIn || totals.checkedIn > 0;

  const wishEntries: WishView[] = (wishes?.items ?? [])
    .map((entry) => ({
      id: entry.id,
      authorName: entry.authorName,
      partyDisplayName: entry.partyDisplayName,
      message: entry.message,
      visibility: entry.visibility,
      moderation: entry.moderation,
      createdOn: formatInstantShort(entry.createdAt, event.timeZone),
    }))
    .sort((a, b) => MODERATION_ORDER[a.moderation] - MODERATION_ORDER[b.moderation]);
  const waiting = wishEntries.filter(
    (entry) => entry.visibility === "WALL" && entry.moderation === "PENDING",
  ).length;
  const showWishes =
    wishes !== null && (event.invitation.wellMode !== "NONE" || wishEntries.length > 0);

  return (
    <div className="wrap sb-page" {...experienceModeAttr(memorial)}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{responses.title}</h1>
          <p className="lead">{responses.lead}</p>
        </div>
        {totals.guests > 0 ? (
          <div className="cluster sb-header-actions">
            <a
              className={buttonClass({ variant: "secondary", size: "small" })}
              href={routes.responsesCsv(eventId)}
              download
            >
              <Download className="icon" aria-hidden="true" />
              {responses.downloadCsv}
            </a>
            {dietary !== null ? (
              <a
                className={buttonClass({ variant: "secondary", size: "small" })}
                href={`${routes.responsesCsv(eventId)}?includeHealth=true`}
                download
              >
                <Download className="icon" aria-hidden="true" />
                {responses.downloadCsvHealth}
              </a>
            ) : null}
            <Link
              className={buttonClass({ size: "small", variant: canCheckIn ? "primary" : "ghost" })}
              href={routes.checkIn(eventId)}
            >
              <DoorOpen className="icon" aria-hidden="true" />
              {canCheckIn ? responses.checkIn : responses.checkInPremium}
            </Link>
          </div>
        ) : null}
      </header>

      <ResponsesNav eventId={eventId} current="responses" copy={responses.nav} />

      {totals.guests === 0 ? (
        <EmptyState
          title={responses.noGuests.title}
          actions={
            <Link className={buttonClass()} href={routes.eventTab(eventId, "guests")}>
              {responses.noGuests.action}
            </Link>
          }
        >
          <p>{responses.noGuests.body}</p>
        </EmptyState>
      ) : (
        <>
          <Stats label={responses.stats.label} className="sb-stats">
            <StatTile
              label={responses.stats.households}
              value={totals.partiesResponded}
              note={fillCopy(responses.stats.householdsNote, { total: totals.parties })}
            />
            <StatTile label={responses.stats.adults} value={totals.adultsYes} />
            <StatTile label={responses.stats.children} value={totals.childrenYes} />
            {showMaybe ? <StatTile label={responses.stats.maybe} value={totals.maybe} /> : null}
            <StatTile label={responses.stats.no} value={totals.no} />
            <StatTile
              label={responses.stats.pending}
              value={totals.pending}
              note={responses.stats.pendingNote}
            />
            {showCheckedIn ? (
              <StatTile
                label={responses.stats.checkedIn}
                value={totals.checkedIn}
                note={fillCopy(responses.stats.checkedInNote, { total: attending })}
              />
            ) : null}
          </Stats>

          <Notice tone={deadline.state === "CLOSED" ? "warning" : "info"} className="sb-notice">
            <p>{deadlineText(responses.deadline, deadline, memorial)}</p>
            {deadline.state === "NONE" ? (
              <p className="sb-premium">
                <Link className="link" href={routes.eventTab(eventId, "settings")}>
                  {responses.deadline.noneAction}
                </Link>
              </p>
            ) : null}
            {summary.linkedOrder ? <p>{responses.headcountLinked}</p> : null}
          </Notice>

          {totals.partiesResponded === 0 ? (
            <EmptyState
              title={responses.empty.title}
              level={2}
              actions={
                <Link className={buttonClass()} href={routes.eventTab(eventId, "share")}>
                  {responses.empty.share}
                </Link>
              }
            >
              <p>{responses.empty.body}</p>
            </EmptyState>
          ) : (
            <div className="sb-columns">
              <section className="card" aria-labelledby="responses-recent-title">
                <h2 id="responses-recent-title" className="card-title">
                  {responses.recent.title}
                </h2>
                {summary.recent.length === 0 ? (
                  <p className="muted">{responses.recent.empty}</p>
                ) : (
                  <ul className="sb-feed">
                    {summary.recent.map((reply, index) => (
                      <li key={`${reply.partyDisplayName}-${reply.respondedAt}-${index}`}>
                        <span className="sb-feed-main">
                          <strong>{reply.partyDisplayName}</strong>
                          <span className="sb-feed-date num">
                            {formatInstantShort(reply.respondedAt, event.timeZone)}
                          </span>
                        </span>
                        <StatusBadge status={reply.status} labels={common.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" aria-labelledby="responses-messages-title">
                <h2 id="responses-messages-title" className="card-title">
                  {memorial ? responses.messages.titleMemorial : responses.messages.title}
                </h2>
                {summary.messages.length === 0 ? (
                  <p className="muted">{responses.messages.empty}</p>
                ) : (
                  <ul className="sb-quotes">
                    {summary.messages.map((message, index) => (
                      <li key={`${message.partyDisplayName}-${message.respondedAt}-${index}`}>
                        <blockquote>{message.message}</blockquote>
                        <p className="sb-quote-from">
                          {message.partyDisplayName}
                          <span className="num">
                            {formatInstantShort(message.respondedAt, event.timeZone)}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {dietary !== null && totals.partiesResponded > 0 ? (
            <section className="sb-section" aria-labelledby="responses-dietary-title">
              <h2 id="responses-dietary-title">{responses.dietary.title}</h2>
              <p>{responses.dietary.lead}</p>
              <DietarySection matrix={dietary} copy={responses.dietary} common={common} />
            </section>
          ) : null}

          {event.invitation.rsvpConfig.songPrompt !== "HIDDEN" ||
          summary.songRequests.length > 0 ? (
            <section className="sb-section" aria-labelledby="responses-songs-title">
              <h2 id="responses-songs-title">
                {memorial ? responses.songs.titleMemorial : responses.songs.title}
              </h2>
              {summary.songRequests.length === 0 ? (
                <p className="muted">
                  {memorial ? responses.songs.emptyMemorial : responses.songs.empty}
                </p>
              ) : (
                <ul className="sb-songs">
                  {summary.songRequests.map((request, index) => (
                    <li key={`${request.partyDisplayName}-${request.song}-${index}`}>
                      <span className="sb-song">{request.song}</span>
                      <span className="sb-song-from">{request.partyDisplayName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}

      {showWishes ? (
        <section className="sb-section" aria-labelledby="responses-wishes-title">
          <h2 id="responses-wishes-title" className="sb-title-row">
            {memorial ? responses.wishes.titleMemorial : responses.wishes.title}
            {waiting > 0 ? (
              <Badge tone="warning">
                {fillCopy(responses.wishes.pendingCount, { count: waiting })}
              </Badge>
            ) : null}
          </h2>
          <p>{memorial ? responses.wishes.leadMemorial : responses.wishes.lead}</p>
          {wishEntries.length === 0 ? (
            <p className="muted">
              {memorial ? responses.wishes.emptyMemorial : responses.wishes.empty}
            </p>
          ) : (
            <WishQueue eventId={eventId} entries={wishEntries} copy={responses.wishes} />
          )}
        </section>
      ) : null}
    </div>
  );
}
