import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { EventBadges } from "@/components/event-studio/EventCard";
import { StudioTabs } from "@/components/studio/StudioTabs";
import { buttonClass, Notice } from "@/components/ui";
import { formatLocalDateTime } from "@/lib/dates";
import { isMemorialEvent, occasionLabel } from "@/lib/event-studio/catalog";
import { loadEvent } from "@/lib/event-studio/data";
import { requireHost } from "@/lib/session";

/**
 * The frame around every page of one event: the event name, date and status, a "Preview" link
 * to the invitation as the first household sees it, then the tab navigation.
 *
 * `GET /v1/events/{eventId}` answers 404 for an event that does not exist or belongs to someone
 * else, which becomes the not-found page. A memorial event puts the whole area in Memorial
 * Mode (calm palette, no celebratory detail).
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  await requireHost();
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  const shell = getInvitationShell("en").studio;
  const copy = getInvitationStudio("en");
  const memorial = isMemorialEvent(event);
  // A guest link is a credential: it is only ever present for hosts who may edit the event.
  const previewPath = event.invitation.previewPath?.startsWith("/i/")
    ? event.invitation.previewPath
    : null;

  return (
    <div className="es-scope" data-experience-mode={memorial ? "memorial" : undefined}>
      <div className="wrap es-header">
        <div className="es-header-main">
          <p className="es-header-title">{event.title}</p>
          <p className="es-header-meta">
            {occasionLabel(event.ceremonySlug, copy.catalog)}
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {formatLocalDateTime(event.startsAtLocal)}
          </p>
        </div>
        <div className="cluster es-header-side">
          <EventBadges
            published={event.invitation.publishedAt !== null}
            past={Date.parse(event.startsAt) < Date.now()}
            memorial={memorial}
            effectivePlan={event.invitation.effectivePlan}
            role={event.role}
            copy={copy}
          />
          {previewPath ? (
            <a
              className={buttonClass({ variant: "secondary", size: "small" })}
              href={previewPath}
              target="_blank"
              rel="noopener"
              aria-label={copy.eventHeader.previewLabel}
            >
              <ExternalLink className="icon" aria-hidden="true" />
              {copy.eventHeader.preview}
            </a>
          ) : null}
        </div>
      </div>
      <StudioTabs eventId={eventId} labels={shell.tabs} navLabel={shell.tabsLabel} />
      {event.role === "VIEWER" ? (
        <div className="wrap es-header-notice">
          <Notice>{copy.eventHeader.viewOnly}</Notice>
        </div>
      ) : null}
      {children}
    </div>
  );
}
