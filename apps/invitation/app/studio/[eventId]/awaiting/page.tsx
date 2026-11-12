import type { Metadata } from "next";
import Link from "next/link";
import { fillCopy, getInvitationShell, getInvitationStudioGuests } from "@managevent/i18n";
import { AwaitingList } from "@/components/awaiting/AwaitingList";
import { ReminderEmailForm } from "@/components/awaiting/ReminderEmailForm";
import { PremiumPointer } from "@/components/guest-list/PremiumPointer";
import { ResponsesNav } from "@/components/responses/ResponsesNav";
import { buttonClass, CopyButton, EmptyState, Notice } from "@/components/ui";
import { formatLocalDate } from "@/lib/dates";
import { deadlineText } from "@/lib/guest-list/deadline";
import {
  experienceModeAttr,
  isMemorial,
  loadEvent,
  premiumPointerFor,
} from "@/lib/guest-list/event";
import { loadAllParties, toLinkPartyView } from "@/lib/guest-list/load";
import { personalise, reminderMessageTemplate } from "@/lib/guest-list/messages";
import { hasPendingGuest } from "@/lib/guest-list/view";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

const copy = getInvitationStudioGuests("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.awaiting.metaTitle);

export default async function EventAwaitingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { capabilities } = await requireHost();
  const api = await getServerApi();
  const event = await loadEvent(api, eventId);
  const [loaded, summary, messaging] = await Promise.all([
    // Every household, not the API's `status: "PENDING"` filter: that filter is on the
    // household's overall status, which is already "attending" once one member says yes, so a
    // guest added later (or left unanswered) would be counted as awaiting but never listed.
    loadAllParties(api, eventId),
    api.responses.getSummary(eventId),
    api.messaging.getStatus(eventId),
  ]);

  const memorial = isMemorial(event);
  const published = event.invitation.publishedAt !== null;
  const parties = loaded.items
    .filter(hasPendingGuest)
    .map((party) => toLinkPartyView(party, event.timeZone));
  const { awaiting, responses, common } = copy;
  const { deadline } = summary;
  const closed = deadline.state === "CLOSED";
  const premium = premiumPointerFor(event, capabilities);
  const emailReady = capabilities.emailInvitations && messaging.emailConfigured;

  const reminderTemplate = reminderMessageTemplate(
    awaiting.reminder,
    { title: event.title, hosts: event.invitation.content.hosts, memorial },
    deadline.rsvpDeadlineLocal && !closed ? formatLocalDate(deadline.rsvpDeadlineLocal) : null,
  );
  const genericReminder = personalise(
    reminderTemplate,
    memorial ? awaiting.reminder.genericNameMemorial : awaiting.reminder.genericName,
    awaiting.reminder.genericLink,
  );

  return (
    <div className="wrap sb-page" {...experienceModeAttr(memorial)}>
      <header className="page-header">
        <div>
          <h1 className="page-title">{awaiting.title}</h1>
          <p className="lead">{memorial ? awaiting.leadMemorial : awaiting.lead}</p>
        </div>
      </header>

      <ResponsesNav eventId={eventId} current="awaiting" copy={responses.nav} />

      {summary.totals.guests === 0 ? (
        <EmptyState
          title={awaiting.noGuests.title}
          actions={
            <Link className={buttonClass()} href={routes.eventTab(eventId, "guests")}>
              {awaiting.noGuests.action}
            </Link>
          }
        >
          <p>{awaiting.noGuests.body}</p>
        </EmptyState>
      ) : parties.length === 0 ? (
        <EmptyState
          title={awaiting.empty.title}
          actions={
            <Link className={buttonClass()} href={routes.eventTab(eventId, "responses")}>
              {awaiting.empty.action}
            </Link>
          }
        >
          <p>{awaiting.empty.body}</p>
        </EmptyState>
      ) : (
        <>
          <Notice tone={closed ? "warning" : "info"} className="sb-notice">
            <p>
              <strong>
                {fillCopy(parties.length === 1 ? awaiting.countOne : awaiting.count, {
                  count: parties.length,
                })}
              </strong>{" "}
              {deadlineText(responses.deadline, deadline, memorial)}
            </p>
          </Notice>

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

          <div className="sb-columns sb-columns-wide">
            <section aria-labelledby="awaiting-list-title">
              <h2 id="awaiting-list-title" className="sb-h2">
                {awaiting.list.title}
              </h2>
              <AwaitingList
                eventId={eventId}
                parties={parties}
                reminderTemplate={reminderTemplate}
                allowMaybe={event.invitation.rsvpConfig.allowMaybe}
                copy={awaiting}
                replyCopy={copy.guests.reply}
                common={common}
              />
              {loaded.truncated ? (
                <Notice tone="warning" className="sb-notice">
                  {common.loadMoreFailed}
                </Notice>
              ) : null}
            </section>

            <div className="sb-side">
              <section className="card" aria-labelledby="awaiting-reminder-title">
                <h2 id="awaiting-reminder-title" className="card-title">
                  {awaiting.reminder.title}
                </h2>
                <p className="card-body">{awaiting.reminder.lead}</p>
                <p className="sb-message-text">{genericReminder}</p>
                <CopyButton
                  value={genericReminder}
                  label={awaiting.reminder.copy}
                  copiedLabel={awaiting.reminder.copied}
                />
              </section>

              <section className="card" aria-labelledby="awaiting-email-title">
                <h2 id="awaiting-email-title" className="card-title">
                  {awaiting.email.title}
                </h2>
                {!messaging.remindersEntitled ? (
                  premium ? (
                    <>
                      <p>
                        <strong>{awaiting.email.premiumTitle}</strong>
                      </p>
                      <p className="card-body">{awaiting.email.premium}</p>
                      <PremiumPointer {...premium} copy={common.premium} />
                    </>
                  ) : (
                    <p className="card-body">{awaiting.email.premium}</p>
                  )
                ) : !emailReady ? (
                  <>
                    <p className="card-body">{shell.capabilities.emailInvitationsOff}</p>
                    <p className="sb-premium">
                      <a className="link" href={wwwLinks.contact} rel="noopener">
                        {shell.capabilities.contactUs}
                      </a>
                    </p>
                  </>
                ) : closed ? (
                  <p className="card-body">{awaiting.email.closed}</p>
                ) : !published ? (
                  <p className="card-body">{awaiting.email.notPublished}</p>
                ) : (
                  <>
                    <p className="card-body">{awaiting.email.lead}</p>
                    <ReminderEmailForm
                      eventId={eventId}
                      timeZone={event.timeZone}
                      copy={awaiting.email}
                    />
                  </>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
