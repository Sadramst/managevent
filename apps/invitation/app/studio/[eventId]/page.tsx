import type { Metadata } from "next";
import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { fillCopy, getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { Card } from "@managevent/ui/brand";
import { PublishPanel } from "@/components/event-studio/PublishPanel";
import { InvitationPreview } from "@/components/invitation-preview/InvitationPreview";
import { buttonClass, CopyButton, EmptyState, Notice, Stats, StatTile } from "@/components/ui";
import { formatLocalDateTime } from "@/lib/dates";
import { isMemorialEvent, occasionLabel } from "@/lib/event-studio/catalog";
import { loadEvent, loadPlan, loadSummaryOptional } from "@/lib/event-studio/data";
import { privateMetadata } from "@/lib/metadata";
import { requireHost } from "@/lib/session";
import { absoluteInviteUrl, routes } from "@/lib/urls";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.overview.title);

function countNumber(value: string | string[] | undefined): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 99) : 0;
}

/**
 * Overview of one event: publish or unpublish, what is still to do, replies so far, a preview
 * of the invitation, the event details and the plan.
 */
export default async function EventOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ created?: string | string[]; skipped?: string | string[] }>;
}) {
  await requireHost();
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const event = await loadEvent(eventId);
  const [summary, plan] = await Promise.all([loadSummaryOptional(eventId), loadPlan(eventId)]);

  const text = copy.overview;
  const { invitation, checklist } = event;
  const content = invitation.content;
  const memorial = isMemorialEvent(event);
  const published = invitation.publishedAt !== null;
  const canEdit = event.role !== "VIEWER";
  const skipped = countNumber(query.skipped);

  const detailsHref = routes.eventTab(eventId, "content");
  const guestsHref = routes.eventTab(eventId, "guests");
  const settingsHref = routes.eventTab(eventId, "settings");
  const previewPath = invitation.previewPath?.startsWith("/i/") ? invitation.previewPath : null;
  const previewUrl = absoluteInviteUrl(previewPath);

  const steps = [
    {
      key: "wording",
      done: checklist.hasWording,
      href: `${detailsHref}#wording`,
      ...text.checklist.wording,
    },
    {
      key: "venue",
      done: checklist.hasVenue,
      href: `${detailsHref}#venue`,
      ...text.checklist.venue,
    },
    { key: "guests", done: checklist.hasGuests, href: guestsHref, ...text.checklist.guests },
    { key: "published", done: checklist.published, href: null, ...text.checklist.published },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  const totals = summary?.totals;
  const guestCount = totals?.guests ?? event.counts.guests;
  const partyCount = totals?.parties ?? event.counts.parties;
  const coming = totals ? totals.adultsYes + totals.childrenYes : event.counts.yes;
  const awaiting = totals?.pending ?? event.counts.pending;
  const deadline = summary?.deadline;
  const deadlineDate = deadline?.rsvpDeadlineLocal
    ? formatLocalDateTime(deadline.rsvpDeadlineLocal)
    : null;

  const guestLimit = plan.usage.guestLimit;

  return (
    <div className="wrap es-page es-page-overview">
      <h1 className="sr-only">{text.title}</h1>

      {query.created === "1" ? (
        <Notice tone="success" role="status" title={text.created.title} className="es-gap">
          <p>{text.created.body}</p>
          {skipped > 0 ? <p>{fillCopy(text.created.guestsSkipped, { count: skipped })}</p> : null}
        </Notice>
      ) : null}

      <div className="es-overview">
        <div className="es-overview-main">
          <PublishPanel
            eventId={eventId}
            published={published}
            canEdit={canEdit}
            shareHref={routes.eventTab(eventId, "share")}
            fixLinks={{
              HEADLINE: `${detailsHref}#wording`,
              HOSTS: `${detailsHref}#wording`,
              VENUE: `${detailsHref}#venue`,
              START_IN_FUTURE: `${detailsHref}#event`,
            }}
            copy={text.publish}
            networkError={shell.errors.NETWORK_ERROR}
          />

          {doneCount < steps.length ? (
            <section aria-labelledby="checklist-title" className="es-block">
              <div className="es-block-head">
                <h2 id="checklist-title" className="es-block-title">
                  {text.checklist.title}
                </h2>
                <p className="muted small">
                  {fillCopy(text.checklist.progress, { done: doneCount, total: steps.length })}
                </p>
              </div>
              <progress
                className="es-meter es-checklist-meter"
                max={steps.length}
                value={doneCount}
                aria-label={text.checklist.title}
              />
              <ol className="es-checklist">
                {steps.map((step) => (
                  <li key={step.key} data-done={step.done ? true : undefined}>
                    <span className="es-check-mark" aria-hidden="true">
                      {step.done ? <Check /> : null}
                    </span>
                    <div className="es-check-text">
                      <p className="es-check-title">
                        {step.title}
                        <span className="sr-only">
                          : {step.done ? text.checklist.done : text.checklist.todo}
                        </span>
                      </p>
                      <p className="muted small">{step.body}</p>
                    </div>
                    {step.done || !canEdit || !step.href ? null : (
                      <Link className="link es-check-action" href={step.href}>
                        {step.action}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section aria-labelledby="stats-title" className="es-block">
            <div className="es-block-head">
              <h2 id="stats-title" className="es-block-title">
                {text.stats.title}
              </h2>
              {guestCount > 0 ? (
                <Link className="link" href={routes.eventTab(eventId, "responses")}>
                  {text.stats.viewResponses}
                </Link>
              ) : null}
            </div>
            {guestCount === 0 ? (
              <EmptyState
                level={3}
                title={text.stats.emptyTitle}
                actions={
                  canEdit ? (
                    <Link className={buttonClass()} href={guestsHref}>
                      {text.stats.addGuests}
                    </Link>
                  ) : undefined
                }
              >
                {text.stats.emptyBody}
              </EmptyState>
            ) : (
              <>
                <Stats label={text.stats.title} className="es-stats">
                  <StatTile
                    label={text.stats.invited}
                    value={guestCount}
                    note={
                      partyCount === 1
                        ? text.stats.householdsOne
                        : fillCopy(text.stats.households, { count: partyCount })
                    }
                  />
                  <StatTile
                    label={text.stats.coming}
                    value={coming}
                    note={
                      totals
                        ? fillCopy(text.stats.comingNote, {
                            adults: totals.adultsYes,
                            children: totals.childrenYes,
                          })
                        : undefined
                    }
                  />
                  {totals ? <StatTile label={text.stats.notComing} value={totals.no} /> : null}
                  <StatTile
                    label={text.stats.awaiting}
                    value={awaiting}
                    note={
                      totals && totals.maybe > 0
                        ? fillCopy(text.stats.maybe, { count: totals.maybe })
                        : undefined
                    }
                  />
                </Stats>
                <p className="muted small es-stats-foot">
                  {!deadline || deadline.state === "NONE" || !deadlineDate
                    ? text.stats.deadlineNone
                    : deadline.state === "CLOSED"
                      ? fillCopy(text.stats.deadlineClosed, { date: deadlineDate })
                      : deadline.state === "DUE_TODAY"
                        ? text.stats.deadlineToday
                        : fillCopy(text.stats.deadlineOpen, { date: deadlineDate })}{" "}
                  {canEdit ? (
                    <Link className="link" href={`${settingsHref}#replies`}>
                      {!deadline || deadline.state === "NONE"
                        ? text.stats.setDeadline
                        : text.stats.changeDeadline}
                    </Link>
                  ) : null}
                  {awaiting > 0 ? (
                    <>
                      {" "}
                      <Link className="link" href={routes.eventTab(eventId, "awaiting")}>
                        {text.stats.viewAwaiting}
                      </Link>
                    </>
                  ) : null}
                </p>
              </>
            )}
          </section>

          <div className="es-overview-cards">
            <Card as="section" aria-labelledby="event-title" className="es-side-card">
              <h2 id="event-title" className="es-block-title">
                {text.event.title}
              </h2>
              <dl className="dl es-dl">
                <div>
                  <dt>{text.event.occasion}</dt>
                  <dd>{occasionLabel(event.ceremonySlug, copy.catalog)}</dd>
                </div>
                <div>
                  <dt>{text.event.when}</dt>
                  <dd>{formatLocalDateTime(event.startsAtLocal)}</dd>
                </div>
                <div>
                  <dt>{text.event.where}</dt>
                  <dd>{content.venue?.name || text.event.noVenue}</dd>
                </div>
                <div>
                  <dt>{text.event.template}</dt>
                  <dd>{copy.catalog.templates[invitation.templateSlug].name}</dd>
                </div>
                <div>
                  <dt>{text.event.colours}</dt>
                  <dd>{copy.catalog.themes[invitation.themeId]}</dd>
                </div>
              </dl>
              {canEdit ? (
                <div className="cluster">
                  <Link className="link" href={detailsHref}>
                    {text.event.edit}
                  </Link>
                  <Link className="link" href={routes.eventTab(eventId, "design")}>
                    {text.event.design}
                  </Link>
                </div>
              ) : null}
            </Card>

            <Card as="section" aria-labelledby="plan-title" className="es-side-card">
              <h2 id="plan-title" className="es-block-title">
                {text.plan.title}
              </h2>
              <p className="es-plan-name">
                {memorial ? copy.catalog.plans.memorial : copy.catalog.plans[plan.effectivePlan]}
              </p>
              <p className="muted small">
                {memorial
                  ? text.plan.memorialBody
                  : plan.effectivePlan === "FREE"
                    ? fillCopy(text.plan.freeBody, { limit: guestLimit ?? "" })
                    : plan.effectivePlan === "AGENCY"
                      ? text.plan.agencyBody
                      : text.plan.premiumBody}
              </p>
              <p className="small num">
                {guestLimit === null
                  ? fillCopy(text.plan.guestsUnlimited, { count: plan.usage.guests })
                  : fillCopy(text.plan.guestsUsed, { count: plan.usage.guests, limit: guestLimit })}
              </p>
              {guestLimit !== null ? (
                <progress
                  className="es-meter"
                  max={guestLimit}
                  value={Math.min(plan.usage.guests, guestLimit)}
                  aria-label={text.plan.title}
                />
              ) : null}
              {memorial ? null : (
                <Link className="link" href={`${settingsHref}#plan`}>
                  {plan.effectivePlan === "FREE" ? text.plan.manage : text.plan.view}
                </Link>
              )}
            </Card>
          </div>
        </div>

        <aside className="es-overview-side">
          <Card as="section" aria-labelledby="preview-title" className="es-side-card">
            <h2 id="preview-title" className="es-block-title">
              {text.preview.title}
            </h2>
            <InvitationPreview
              themeId={invitation.themeId}
              templateSlug={invitation.templateSlug}
              memorial={memorial}
              headline={content.headline}
              subheadline={content.subheadline}
              hosts={content.hosts}
              honoureeName={content.honoureeName}
              wording={content.wording}
              dateLine={formatLocalDateTime(event.startsAtLocal)}
              venueName={content.venue?.name}
              venueAddress={content.venue?.address}
              coverImageUrl={content.coverImageUrl}
              labels={copy.preview}
            />
            {previewPath && previewUrl ? (
              <>
                <p className="muted small">
                  {published ? text.preview.liveNote : text.preview.draftNote}
                </p>
                <div className="cluster">
                  <a
                    className={buttonClass({ variant: "secondary", size: "small" })}
                    href={previewPath}
                    target="_blank"
                    rel="noopener"
                  >
                    <ExternalLink className="icon" aria-hidden="true" />
                    {text.preview.open}
                  </a>
                  <CopyButton value={previewUrl} label={text.preview.copy} variant="ghost" />
                </div>
              </>
            ) : canEdit ? (
              <p className="muted small">
                {text.preview.none}{" "}
                <Link className="link" href={guestsHref}>
                  {text.preview.addGuest}
                </Link>
              </p>
            ) : (
              <p className="muted small">{text.preview.unavailable}</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
