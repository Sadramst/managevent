import Link from "next/link";
import type { InvitationStudioCopy } from "@managevent/i18n";
import type { HostEventSummary } from "@managevent/validators";
import { InvitationPreview } from "@/components/invitation-preview/InvitationPreview";
import { Badge } from "@/components/ui/Badge";
import { formatLocalDate } from "@/lib/dates";
import { isMemorialEvent, occasionLabel } from "@/lib/event-studio/catalog";
import { routes } from "@/lib/urls";

export interface EventCardProps {
  event: HostEventSummary;
  /** True when the event has already started (decided once by the page, on the server). */
  past: boolean;
  copy: InvitationStudioCopy;
}

/** The status, plan and role badges of an event. Shared by the list card and the event header. */
export function EventBadges({
  published,
  past,
  memorial,
  effectivePlan,
  role,
  copy,
}: {
  published: boolean;
  past: boolean;
  memorial: boolean;
  effectivePlan: HostEventSummary["invitation"]["effectivePlan"];
  role: HostEventSummary["role"];
  copy: InvitationStudioCopy;
}) {
  const { status, plans } = copy.catalog;
  return (
    <>
      {published ? (
        <Badge tone="success">{status.live}</Badge>
      ) : (
        <Badge tone="neutral">{status.draft}</Badge>
      )}
      {past ? <Badge tone="neutral">{status.past}</Badge> : null}
      {/* A memorial event has every feature at no cost, so a plan badge would only be noise. */}
      {memorial ? null : effectivePlan === "FREE" ? (
        <Badge tone="neutral">{plans.FREE}</Badge>
      ) : (
        <Badge>{effectivePlan === "AGENCY" ? plans.AGENCY : copy.catalog.premium}</Badge>
      )}
      {role !== "OWNER" ? <Badge tone="neutral">{copy.events.card.roles[role]}</Badge> : null}
    </>
  );
}

/**
 * One event on "My events": a small tile in the invitation's own colours, the name, the date,
 * its status and plan, and how many guests are invited, coming and still to reply.
 * The whole card is one link to the event.
 */
export function EventCard({ event, past, copy }: EventCardProps) {
  const card = copy.events.card;
  const memorial = isMemorialEvent(event);
  const occasion = occasionLabel(event.ceremonySlug, copy.catalog);
  const { guests, yes, pending } = event.counts;

  return (
    <Link
      className="card card-link es-event"
      href={routes.event(event.id)}
      data-experience-mode={memorial ? "memorial" : undefined}
    >
      <InvitationPreview
        size="thumb"
        themeId={event.invitation.themeId}
        templateSlug={event.invitation.templateSlug}
        memorial={memorial}
        headline={event.title}
        hosts={occasion}
        dateLine=""
        labels={copy.preview}
      />
      <div className="es-event-body">
        <div className="cluster es-event-badges">
          <EventBadges
            published={event.invitation.publishedAt !== null}
            past={past}
            memorial={memorial}
            effectivePlan={event.invitation.effectivePlan}
            role={event.role}
            copy={copy}
          />
        </div>
        <h3 className="card-title es-event-title">{event.title}</h3>
        <p className="es-event-meta">
          {occasion}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {formatLocalDate(event.startsAtLocal, { weekday: true })}
        </p>
        {guests === 0 ? (
          <p className="es-event-empty">{card.noGuests}</p>
        ) : (
          <dl className="es-event-counts">
            <div>
              <dt>{card.invited}</dt>
              <dd className="num">{guests}</dd>
            </div>
            <div>
              <dt>{card.coming}</dt>
              <dd className="num">{yes}</dd>
            </div>
            <div>
              <dt>{card.awaiting}</dt>
              <dd className="num">{pending}</dd>
            </div>
          </dl>
        )}
      </div>
    </Link>
  );
}
