import type { Metadata } from "next";
import Link from "next/link";
import { getInvitationShell, getInvitationStudioGuests } from "@managevent/i18n";
import { CampaignHistory } from "@/components/share/CampaignHistory";
import { EmailInvitations } from "@/components/share/EmailInvitations";
import { ShareLinks } from "@/components/share/ShareLinks";
import { buttonClass, EmptyState, Notice } from "@/components/ui";
import { formatLocalDate } from "@/lib/dates";
import {
  experienceModeAttr,
  isMemorial,
  loadEvent,
  premiumPointerFor,
} from "@/lib/guest-list/event";
import { loadAllParties, toEmailPartyView, toLinkPartyView } from "@/lib/guest-list/load";
import { inviteMessageTemplate, personalise } from "@/lib/guest-list/messages";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

const copy = getInvitationStudioGuests("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.share.metaTitle);

export default async function EventSharePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { capabilities } = await requireHost();
  const api = await getServerApi();
  const event = await loadEvent(api, eventId);
  const [loaded, messaging] = await Promise.all([
    loadAllParties(api, eventId),
    api.messaging.getStatus(eventId),
  ]);

  const memorial = isMemorial(event);
  const published = event.invitation.publishedAt !== null;
  // Each client component gets only what it shows: links without email addresses for the
  // link list, and names without links or contact details for the email list.
  const parties = loaded.items.map((party) => toLinkPartyView(party, event.timeZone));
  const withEmail = loaded.items
    .filter((party) => party.email.hasAddress)
    .map((party) => toEmailPartyView(party, event.timeZone));
  const emailReady = capabilities.emailInvitations && messaging.emailConfigured;
  const { share, common } = copy;

  const messageTemplate = inviteMessageTemplate(
    share.message,
    {
      title: event.title,
      date: formatLocalDate(event.startsAtLocal, { weekday: true }),
      hosts: event.invitation.content.hosts,
      memorial,
    },
    { allowForwarding: event.invitation.allowForwarding },
  );

  return (
    <div className="wrap sb-page" {...experienceModeAttr(memorial)}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{share.title}</h1>
          <p className="lead">{memorial ? share.leadMemorial : share.lead}</p>
        </div>
      </header>

      {!published ? (
        <Notice tone="warning" title={common.notPublishedTitle} className="sb-notice">
          <p>{common.notPublished}</p>
          <p className="sb-premium">
            <Link className="link" href={routes.event(eventId)}>
              {common.publishLink}
            </Link>
          </p>
        </Notice>
      ) : null}

      {loaded.truncated ? (
        <Notice tone="warning" className="sb-notice">
          {common.loadMoreFailed}
        </Notice>
      ) : null}

      {parties.length === 0 ? (
        <EmptyState
          title={share.empty.title}
          actions={
            <Link className={buttonClass()} href={routes.eventTab(eventId, "guests")}>
              {share.empty.action}
            </Link>
          }
        >
          <p>{share.empty.body}</p>
        </EmptyState>
      ) : (
        <>
          <section className="sb-section sb-section-first" aria-labelledby="share-links-title">
            <h2 id="share-links-title">{share.links.title}</h2>
            <details className="sb-message-preview">
              <summary>{share.message.previewTitle}</summary>
              <p className="sb-message-text">
                {personalise(messageTemplate, share.message.sampleName, share.message.sampleLink)}
              </p>
              <p className="notice">{share.message.previewNote}</p>
            </details>
            <ShareLinks
              eventId={eventId}
              parties={parties}
              messageTemplate={messageTemplate}
              copy={share}
              common={common}
            />
          </section>

          <section className="sb-section" aria-labelledby="share-email-title">
            <h2 id="share-email-title">{share.email.title}</h2>
            {!emailReady ? (
              <Notice>
                <p>{shell.capabilities.emailInvitationsOff}</p>
                <p className="sb-premium">
                  <a className="link" href={wwwLinks.contact} rel="noopener">
                    {shell.capabilities.contactUs}
                  </a>
                </p>
              </Notice>
            ) : (
              <>
                <p>{share.email.lead}</p>
                {!published ? (
                  <Notice tone="warning">{share.email.notPublished}</Notice>
                ) : withEmail.length === 0 ? (
                  <Notice>
                    <p>{share.email.noAddresses}</p>
                    <p className="sb-premium">
                      <Link className="link" href={routes.eventTab(eventId, "guests")}>
                        {share.empty.action}
                      </Link>
                    </p>
                  </Notice>
                ) : (
                  <EmailInvitations
                    eventId={eventId}
                    parties={withEmail}
                    quota={messaging.quota}
                    copy={share.email}
                    premiumCopy={common.premium}
                    premium={premiumPointerFor(event, capabilities)}
                  />
                )}
              </>
            )}
          </section>
        </>
      )}

      {messaging.campaigns.length > 0 ? (
        <section className="sb-section" aria-labelledby="share-history-title">
          <h2 id="share-history-title">{share.history.title}</h2>
          <CampaignHistory
            campaigns={messaging.campaigns}
            timeZone={event.timeZone}
            copy={share.history}
          />
        </section>
      ) : null}
    </div>
  );
}
