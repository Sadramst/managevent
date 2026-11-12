import type { Metadata } from "next";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { DesignEditor } from "@/components/event-studio/DesignEditor";
import { formatLocalDateTime } from "@/lib/dates";
import { buildCatalog, isMemorialEvent } from "@/lib/event-studio/catalog";
import { loadEvent, loadPlan } from "@/lib/event-studio/data";
import { privateMetadata } from "@/lib/metadata";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.design.title);

/**
 * Design: the template, the colour theme and the opening style, with a live preview. Which
 * options the plan includes comes from `GET /v1/events/{eventId}/plan`; a memorial event is
 * offered memorial templates and colours only.
 */
export default async function EventDesignPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireHost();
  const { eventId } = await params;
  const event = await loadEvent(eventId);
  const plan = await loadPlan(eventId);
  const catalog = buildCatalog(copy.catalog);
  const memorial = isMemorialEvent(event);
  const mode = memorial ? "MEMORIAL" : "CELEBRATION";
  const { invitation } = event;
  const content = invitation.content;

  return (
    <div className="wrap es-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{copy.design.title}</h1>
          <p className="lead">{copy.design.lead}</p>
        </div>
      </header>
      <DesignEditor
        eventId={eventId}
        memorial={memorial}
        canEdit={event.role !== "VIEWER"}
        initial={{
          templateSlug: invitation.templateSlug,
          themeId: invitation.themeId,
          gateStyle: invitation.gateStyle,
        }}
        updatedAt={invitation.updatedAt}
        entitlements={{
          allThemes: plan.entitlements.allThemesAndAnimations,
          allGateStyles: plan.entitlements.allGateStyles,
        }}
        templates={catalog.templates.filter((template) => template.mode === mode)}
        themes={catalog.themes.filter((theme) => theme.mode === mode)}
        gateStyles={catalog.gateStyles}
        content={{
          headline: content.headline,
          subheadline: content.subheadline,
          hosts: content.hosts,
          honoureeName: content.honoureeName,
          wording: content.wording,
          dateLine: formatLocalDateTime(event.startsAtLocal),
          venueName: content.venue?.name,
          venueAddress: content.venue?.address,
          coverImageUrl: content.coverImageUrl,
        }}
        planHref={`${routes.eventTab(eventId, "settings")}#plan`}
        copy={{
          design: copy.design,
          preview: copy.preview,
          premium: copy.catalog.premium,
          saveBar: { saving: shell.ui.saving, preview: copy.content.saveBar.preview },
          unsaved: copy.unsaved,
          staleError: shell.errors.STALE_WRITE,
          networkError: shell.errors.NETWORK_ERROR,
        }}
      />
    </div>
  );
}
