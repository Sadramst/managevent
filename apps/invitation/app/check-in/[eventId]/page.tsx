import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isApiError } from "@managevent/api-client";
import { getExperienceMode, getInvitationStudioGuests } from "@managevent/i18n";
import type { CheckInRoster } from "@managevent/validators";
import { DoorCheckIn } from "@/components/check-in/DoorCheckIn";
import { PremiumPointer } from "@/components/guest-list/PremiumPointer";
import { buttonClass } from "@/components/ui";
import { toDoorRoster } from "@/lib/guest-list/door-load";
import { experienceModeAttr } from "@/lib/guest-list/event";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

const copy = getInvitationStudioGuests("en");

export const metadata: Metadata = privateMetadata(copy.checkIn.metaTitle);

type Outcome =
  { kind: "roster"; roster: CheckInRoster } | { kind: "premium" } | { kind: "forbidden" };

/**
 * Door check-in for one event. Outside the studio layout, so it signs the host in itself and
 * has no site chrome: on the day the whole screen belongs to the door list.
 *
 * `FEATURE_NOT_IN_PLAN` explains Premium (with the honest next step), any other 403 says the
 * person may not run the door, and an event they cannot see is a 404.
 */
export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { capabilities } = await requireHost();
  const api = await getServerApi();

  let outcome: Outcome;
  try {
    outcome = { kind: "roster", roster: await api.checkIn.getRoster(eventId) };
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    if (isApiError(err, "FEATURE_NOT_IN_PLAN")) outcome = { kind: "premium" };
    else if (isApiError(err) && err.status === 403) outcome = { kind: "forbidden" };
    else throw err;
  }

  // Door crew cannot read the event itself, so Memorial Mode is known only when the host can.
  const event = await api.events.get(eventId).catch(() => null);
  const memorial =
    event !== null && getExperienceMode({ experienceMode: event.experienceMode }) === "MEMORIAL";
  const { checkIn, common } = copy;

  if (outcome.kind === "roster") {
    return (
      <main id="main" className="sb-page sb-door-page" {...experienceModeAttr(memorial)}>
        <DoorCheckIn
          eventId={eventId}
          roster={toDoorRoster(outcome.roster)}
          copy={checkIn}
          common={common}
          backHref={routes.eventTab(eventId, "responses")}
          guestsHref={routes.eventTab(eventId, "guests")}
        />
      </main>
    );
  }

  const premium = outcome.kind === "premium";
  const message = premium ? checkIn.premium : checkIn.forbidden;
  return (
    <main id="main" className="sb-page sb-door-page" {...experienceModeAttr(memorial)}>
      <div className="wrap wrap-narrow sb-door-message">
        <div className="panel">
          <p className="eyebrow">{checkIn.title}</p>
          <h1 className="page-title">{message.title}</h1>
          <p className="lead">{message.body}</p>
          {premium && !memorial ? (
            <PremiumPointer
              stripeCheckout={capabilities.stripeCheckout}
              settingsHref={routes.eventTab(eventId, "settings")}
              contactHref={wwwLinks.contact}
              copy={common.premium}
            />
          ) : null}
          <p className="page-hero-actions">
            <Link
              className={buttonClass({ variant: "secondary" })}
              href={premium ? routes.event(eventId) : routes.studio}
            >
              {message.back}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
