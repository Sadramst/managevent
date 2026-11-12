import type { Metadata } from "next";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { EventSettings } from "@/components/event-studio/EventSettings";
import { splitLocal } from "@/lib/dates";
import {
  buildCatalog,
  formatAud,
  freeGuestLimit,
  isMemorialEvent,
} from "@/lib/event-studio/catalog";
import { loadEvent, loadPlan } from "@/lib/event-studio/data";
import { privateMetadata } from "@/lib/metadata";
import { requireHost } from "@/lib/session";
import { absoluteUrl, wwwLinks } from "@/lib/urls";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.settings.title);

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Settings: the reply deadline and questions, the wishing well or tribute book, the words in
 * the invitation link, the plan (with the upgrade only when card payments are switched on for
 * this deployment) and deleting the event.
 *
 * Stripe returns here with `?checkout=success&session_id=...`; the page confirms the payment
 * through `confirmCheckoutAction` and then drops the session id from the address.
 */
export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ checkout?: string | string[]; session_id?: string | string[] }>;
}) {
  const { capabilities } = await requireHost();
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const event = await loadEvent(eventId);
  const plan = await loadPlan(eventId);
  const { invitation } = event;
  const memorial = isMemorialEvent(event);
  const catalog = buildCatalog(copy.catalog);
  const checkoutStatus = single(query.checkout);

  return (
    <div className="wrap es-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{copy.settings.title}</h1>
          <p className="lead">{memorial ? copy.settings.leadMemorial : copy.settings.lead}</p>
        </div>
      </header>
      <EventSettings
        eventId={eventId}
        eventTitle={event.title}
        memorial={memorial}
        canEdit={event.role !== "VIEWER"}
        isOwner={event.role === "OWNER"}
        published={invitation.publishedAt !== null}
        updatedAt={invitation.updatedAt}
        startsAtLocal={event.startsAtLocal}
        timeZoneLabel={
          catalog.timeZones.find((zone) => zone.id === event.timeZone)?.label ??
          event.timeZone.replaceAll("_", " ")
        }
        deadline={splitLocal(invitation.rsvpDeadlineLocal)}
        rsvpConfig={invitation.rsvpConfig}
        allowForwarding={invitation.allowForwarding}
        wellMode={invitation.wellMode}
        wellConfig={invitation.wellConfig}
        eventSlug={invitation.eventSlug}
        linkBase={`${absoluteUrl("/i")}/`}
        canCustomiseLink={plan.entitlements.customEventSlug}
        plan={{
          name: memorial ? copy.catalog.plans.memorial : copy.catalog.plans[plan.effectivePlan],
          effectivePlan: plan.effectivePlan,
          guests: plan.usage.guests,
          guestLimit: plan.usage.guestLimit,
          emailsSent: plan.usage.emailsSent,
          emailLimit: plan.usage.emailLimit,
          upgradeAvailable: plan.upgrade.available,
          price: formatAud(plan.upgrade.priceIncGstCents),
          gst: formatAud(plan.upgrade.gstCents),
          freeGuestLimit: freeGuestLimit(),
        }}
        capabilities={{
          stripeCheckout: capabilities.stripeCheckout,
          emailInvitations: capabilities.emailInvitations,
        }}
        checkout={{
          status:
            checkoutStatus === "success" || checkoutStatus === "cancelled" ? checkoutStatus : null,
          sessionId: single(query.session_id),
        }}
        contactUrl={wwwLinks.contact}
        copy={{
          settings: copy.settings,
          capabilities: shell.capabilities,
          errors: {
            STALE_WRITE: shell.errors.STALE_WRITE,
            NETWORK_ERROR: shell.errors.NETWORK_ERROR,
            SLUG_TAKEN: shell.errors.SLUG_TAKEN,
            FEATURE_NOT_IN_PLAN: shell.errors.FEATURE_NOT_IN_PLAN,
          },
          ui: {
            saving: shell.ui.saving,
            cancel: shell.ui.cancel,
            deleting: shell.ui.deleting,
            optional: shell.ui.optional,
          },
          premium: copy.catalog.premium,
        }}
      />
    </div>
  );
}
