import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { SimulatedCheckout } from "@/components/event-studio/SimulatedCheckout";
import { formatAud, isMemorialEvent } from "@/lib/event-studio/catalog";
import { loadEvent, loadPlan } from "@/lib/event-studio/data";
import { privateMetadata } from "@/lib/metadata";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.settings.simulatedCheckout.title);

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default async function EventSimulatedCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  await requireHost();
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const sessionId = single(query.session_id);
  if (!sessionId) {
    redirect(routes.eventTab(eventId, "settings"));
  }

  const [event, plan] = await Promise.all([loadEvent(eventId), loadPlan(eventId)]);
  if (isMemorialEvent(event) || plan.effectivePlan !== "FREE") {
    redirect(`${routes.eventTab(eventId, "share")}?upgraded=1`);
  }

  return (
    <div className="wrap es-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{copy.settings.simulatedCheckout.title}</h1>
          <p className="lead">{copy.settings.simulatedCheckout.lead}</p>
        </div>
      </header>
      <SimulatedCheckout
        eventId={eventId}
        eventTitle={event.title}
        sessionId={sessionId}
        householdCount={event.counts.parties}
        passLabel={copy.settings.plan.passTitle}
        price={formatAud(plan.upgrade.priceIncGstCents)}
        gst={formatAud(plan.upgrade.gstCents)}
        copy={copy.settings.simulatedCheckout}
        networkError={shell.errors.NETWORK_ERROR}
      />
    </div>
  );
}
