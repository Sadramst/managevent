import type { Metadata } from "next";
import { fillCopy, getInvitationStudioGuests } from "@managevent/i18n";
import { GuestList } from "@/components/guest-list/GuestList";
import { PremiumPointer } from "@/components/guest-list/PremiumPointer";
import { Notice, Stats, StatTile } from "@/components/ui";
import { buildCsvTemplate, csvDataUrl } from "@/lib/guest-list/csv-template";
import {
  experienceModeAttr,
  isMemorial,
  loadEvent,
  premiumPointerFor,
} from "@/lib/guest-list/event";
import { loadAllParties, toPartyView } from "@/lib/guest-list/load";
import { guestListTotals } from "@/lib/guest-list/view";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const copy = getInvitationStudioGuests("en");

export const metadata: Metadata = privateMetadata(copy.guests.metaTitle);

/** How close to the free plan's guest limit before the page mentions it. */
const NEAR_LIMIT = 5;

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { capabilities } = await requireHost();
  const api = await getServerApi();
  const event = await loadEvent(api, eventId);
  const [loaded, plan] = await Promise.all([
    loadAllParties(api, eventId),
    api.billing.getPlan(eventId),
  ]);

  const parties = loaded.items.map((party) => toPartyView(party, event.timeZone));
  const totals = guestListTotals(parties);
  const premium = premiumPointerFor(event, capabilities);
  const limit = plan.usage.guestLimit;
  const used = plan.usage.guests;
  const { guests, common } = copy;

  return (
    <div className="wrap sb-page" {...experienceModeAttr(isMemorial(event))}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{guests.title}</h1>
          <p className="lead">{guests.lead}</p>
        </div>
      </header>

      {parties.length > 0 ? (
        <Stats label={guests.stats.label} className="sb-stats">
          <StatTile label={guests.stats.households} value={totals.households} />
          <StatTile
            label={guests.stats.guests}
            value={totals.guests}
            note={limit !== null ? fillCopy(guests.stats.guestsOfLimit, { limit }) : undefined}
          />
          <StatTile label={guests.stats.attending} value={totals.attending} />
          <StatTile label={guests.stats.awaiting} value={totals.awaiting} />
        </Stats>
      ) : null}

      {limit !== null && used >= limit ? (
        <Notice tone="warning" title={guests.limit.reachedTitle} className="sb-notice">
          <p>{fillCopy(guests.limit.reached, { limit, used })}</p>
          {premium ? <PremiumPointer {...premium} copy={common.premium} /> : null}
        </Notice>
      ) : limit !== null && limit - used <= NEAR_LIMIT ? (
        <Notice title={guests.limit.nearTitle} className="sb-notice">
          <p>{fillCopy(guests.limit.near, { limit, used })}</p>
          {premium ? <PremiumPointer {...premium} copy={common.premium} /> : null}
        </Notice>
      ) : null}

      {loaded.truncated ? (
        <Notice tone="warning" className="sb-notice">
          {common.loadMoreFailed}
        </Notice>
      ) : null}

      <GuestList
        eventId={eventId}
        parties={parties}
        copy={guests}
        importCopy={copy.importCsv}
        common={common}
        premium={premium}
        allowMaybe={event.invitation.rsvpConfig.allowMaybe}
        shareHref={routes.eventTab(eventId, "share")}
        templateHref={csvDataUrl(buildCsvTemplate(copy.importCsv.templateRows))}
      />
    </div>
  );
}
