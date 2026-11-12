import type { Metadata } from "next";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { ContentEditor } from "@/components/event-studio/ContentEditor";
import { splitLocal } from "@/lib/dates";
import { buildCatalog, isMemorialEvent, timeZonesIncluding } from "@/lib/event-studio/catalog";
import { loadEvent } from "@/lib/event-studio/data";
import { privateMetadata } from "@/lib/metadata";
import { requireHost } from "@/lib/session";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.content.title);

/**
 * Details: the event's date and time and everything guests read on the invitation (wording,
 * story, schedule, venue, dress code, questions and photos), saved together with one button.
 */
export default async function EventContentPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireHost();
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  const { invitation } = event;
  const start = splitLocal(event.startsAtLocal);
  const end = splitLocal(event.endsAtLocal);
  const catalog = buildCatalog(copy.catalog);

  return (
    <div className="wrap es-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{copy.content.title}</h1>
          <p className="lead">{copy.content.lead}</p>
        </div>
      </header>
      <ContentEditor
        eventId={eventId}
        memorial={isMemorialEvent(event)}
        canEdit={event.role !== "VIEWER"}
        content={invitation.content}
        updatedAt={invitation.updatedAt}
        event={{
          title: event.title,
          date: start.date,
          startTime: start.time,
          endTime: end.time,
          timeZone: event.timeZone,
        }}
        timeZones={timeZonesIncluding(catalog.timeZones, event.timeZone)}
        design={{ themeId: invitation.themeId, templateSlug: invitation.templateSlug }}
        copy={{
          content: copy.content,
          preview: copy.preview,
          dateNames: copy.catalog.dateNames,
          unsaved: copy.unsaved,
          optional: shell.ui.optional,
          networkError: shell.errors.NETWORK_ERROR,
        }}
      />
    </div>
  );
}
