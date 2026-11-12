import { isApiError } from "@managevent/api-client";
import { fillCopy, getAdminPages } from "@managevent/i18n";
import { LeadIdSchema } from "@managevent/validators";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  LeadAssignForm,
  LeadNotesForm,
  LeadStageForm,
} from "../../../../../components/admin-lead-forms";
import { loadCeremonyNames } from "../../../../../lib/admin/ceremonies";
import {
  ceremonyLabel,
  formatPerthDate,
  formatPerthDateTime,
  isMemorialEnquiry,
  leadHref,
  nextLeadStages,
  signInHref,
  stageBadgeClass,
  telHref,
} from "../../../../../lib/admin/leads";
import { getServerApi, requireStaff } from "../../../../../lib/admin/server";

const copy = getAdminPages("en");
/** `LeadUpdateSchema` caps notes at this length. */
const NOTES_MAX_LENGTH = 5000;

/** The enquirer's name is personal information: it stays out of the document title. */
export const metadata: Metadata = { title: copy.lead.eyebrow };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const NotGiven = () => <span className="console-empty-value">{copy.lead.notGiven}</span>;

export default async function LeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const user = await requireStaff();
  const { leadId } = await params;
  // An address that is not a lead id is a missing page, without asking the API.
  if (!LeadIdSchema.safeParse(leadId).success) notFound();

  const api = await getServerApi();
  let lead: Awaited<ReturnType<typeof api.leads.get>>;
  try {
    lead = await api.leads.get(leadId);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    if (isApiError(err, "UNAUTHENTICATED")) {
      redirect(signInHref({ reason: "session", next: leadHref(leadId) }));
    }
    if (isApiError(err, "FORBIDDEN")) redirect(signInHref({ reason: "staff" }));
    throw err;
  }

  const memorial = isMemorialEnquiry(lead.ceremonySlug);
  const occasion = ceremonyLabel(lead.ceremonySlug, loadCeremonyNames());
  const eventDate = lead.eventDate ? formatPerthDate(lead.eventDate) : "";
  const errors = {
    ...copy.errors,
    NOTES_TOO_LONG: fillCopy(copy.errors.NOTES_TOO_LONG, { max: NOTES_MAX_LENGTH }),
  };
  const language =
    (copy.languages as Readonly<Record<string, string>>)[lead.preferredLanguage] ??
    lead.preferredLanguage;
  const utm = lead.utm ?? {};

  return (
    <main
      id="main"
      className="wrap console-main"
      data-experience-mode={memorial ? "memorial" : undefined}
    >
      <a className="console-crumb" href="/admin">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            d="M10 3 5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {copy.lead.back}
      </a>

      <header className="page-header">
        <div>
          <p className="eyebrow">{copy.lead.eyebrow}</p>
          <h1 className="page-title">{lead.name}</h1>
          <div className="console-meta">
            <p>{fillCopy(copy.lead.received, { date: formatPerthDateTime(lead.createdAt) })}</p>
            <p data-testid="lead-updated">
              {fillCopy(copy.lead.updated, { date: formatPerthDateTime(lead.updatedAt) })} (
              {copy.lead.perthTime})
            </p>
          </div>
        </div>
        <span className={stageBadgeClass(lead.stage)} data-testid="lead-stage">
          {copy.stages[lead.stage]}
        </span>
      </header>

      {memorial ? <p className="alert console-note">{copy.lead.memorialNote}</p> : null}

      <div className="console-detail">
        <div className="console-column">
          <section className="card" aria-labelledby="lead-contact">
            <h2 className="console-card-title" id="lead-contact">
              {copy.lead.contactTitle}
            </h2>
            <dl className="dl">
              <Row label={copy.lead.email}>
                <a className="link" href={`mailto:${lead.email}`} dir="ltr">
                  {lead.email}
                </a>
              </Row>
              <Row label={copy.lead.phone}>
                {lead.phone ? (
                  <a className="link" href={telHref(lead.phone)} dir="ltr">
                    {lead.phone}
                  </a>
                ) : (
                  <NotGiven />
                )}
              </Row>
              <Row label={copy.lead.preferredChannel}>{copy.channels[lead.preferredChannel]}</Row>
              <Row label={copy.lead.preferredLanguage}>{language}</Row>
            </dl>
          </section>

          <section className="card" aria-labelledby="lead-event">
            <h2 className="console-card-title" id="lead-event">
              {copy.lead.eventTitle}
            </h2>
            <dl className="dl">
              <Row label={copy.lead.ceremony}>{occasion || <NotGiven />}</Row>
              <Row label={copy.lead.eventDate}>
                {eventDate ? (
                  <span className="num">
                    {lead.dateFlexible
                      ? fillCopy(copy.lead.dateFlexibleWith, { date: eventDate })
                      : eventDate}
                  </span>
                ) : lead.dateFlexible ? (
                  copy.lead.dateFlexible
                ) : (
                  <NotGiven />
                )}
              </Row>
              <Row label={copy.lead.guests}>
                {lead.guestEstimate === null ? (
                  <NotGiven />
                ) : (
                  <span className="num">{lead.guestEstimate}</span>
                )}
              </Row>
              <Row label={copy.lead.area}>{lead.area || <NotGiven />}</Row>
            </dl>
          </section>

          <section className="card" aria-labelledby="lead-message">
            <h2 className="console-card-title" id="lead-message">
              {copy.lead.messageTitle}
            </h2>
            {lead.message ? (
              <p className="console-message" data-testid="lead-message">
                {lead.message}
              </p>
            ) : (
              <p className="console-message console-empty-value">{copy.lead.noMessage}</p>
            )}
          </section>

          <section className="card" aria-labelledby="lead-source">
            <h2 className="console-card-title" id="lead-source">
              {copy.lead.sourceTitle}
            </h2>
            <dl className="dl">
              <Row label={copy.lead.source}>{copy.sources[lead.source]}</Row>
              <Row label={copy.lead.utmSource}>{utm.source || <NotGiven />}</Row>
              {utm.medium ? <Row label={copy.lead.utmMedium}>{utm.medium}</Row> : null}
              {utm.campaign ? <Row label={copy.lead.utmCampaign}>{utm.campaign}</Row> : null}
              {lead.estimateId ? (
                <Row label={copy.lead.estimate}>
                  <span dir="ltr">{lead.estimateId}</span>
                </Row>
              ) : null}
              {lead.eventId ? (
                <Row label={copy.lead.linkedEvent}>
                  <span dir="ltr">{lead.eventId}</span>
                </Row>
              ) : null}
            </dl>
          </section>

          <section className="card" aria-labelledby="lead-consent">
            <h2 className="console-card-title" id="lead-consent">
              {copy.lead.consentTitle}
            </h2>
            <dl className="dl">
              <Row label={copy.lead.marketingConsent}>
                <span
                  className={lead.marketingConsent ? "badge badge-success" : "badge badge-neutral"}
                  data-testid="lead-marketing-consent"
                >
                  {lead.marketingConsent ? copy.lead.consentGiven : copy.lead.consentNotGiven}
                </span>
              </Row>
              {lead.marketingConsentId ? (
                <Row label={copy.lead.consentRecord}>
                  <span dir="ltr">{lead.marketingConsentId}</span>
                </Row>
              ) : null}
            </dl>
            <p className="notice">{copy.lead.consentNote}</p>
          </section>
        </div>

        <div className="console-column">
          <section className="card card-accent" aria-labelledby="lead-stage-title">
            <h2 className="console-card-title" id="lead-stage-title">
              {copy.lead.stageTitle}
            </h2>
            <p className="console-stage-current">
              {copy.lead.stageCurrent}
              <span className={stageBadgeClass(lead.stage)}>{copy.stages[lead.stage]}</span>
            </p>
            <LeadStageForm
              leadId={lead.id}
              stage={lead.stage}
              moves={nextLeadStages(lead.stage).map((stage) => ({
                stage,
                label: copy.stageActions[stage],
              }))}
              copy={{ saved: copy.lead.stageSaved, saving: copy.lead.saving }}
              errors={errors}
            />
          </section>

          <section className="card" aria-labelledby="lead-owner">
            <h2 className="console-card-title" id="lead-owner">
              {copy.lead.assignTitle}
            </h2>
            <p data-testid="lead-owner-value">
              {lead.assignedToUserId === null
                ? copy.lead.unassigned
                : lead.assignedToUserId === user.id
                  ? copy.lead.assignedToYou
                  : copy.lead.assignedToOther}
            </p>
            <LeadAssignForm
              leadId={lead.id}
              assignedToMe={lead.assignedToUserId === user.id}
              assigned={lead.assignedToUserId !== null}
              copy={{
                assignToMe: copy.lead.assignToMe,
                unassign: copy.lead.unassign,
                saved: copy.lead.assignSaved,
                saving: copy.lead.saving,
              }}
              errors={errors}
            />
          </section>

          <section className="card" aria-labelledby="lead-notes-title">
            <h2 className="console-card-title" id="lead-notes-title">
              {copy.lead.notesTitle}
            </h2>
            <LeadNotesForm
              leadId={lead.id}
              notes={lead.notes ?? ""}
              maxLength={NOTES_MAX_LENGTH}
              copy={{
                label: copy.lead.notesLabel,
                help: fillCopy(copy.lead.notesHelp, { max: NOTES_MAX_LENGTH }),
                save: copy.lead.notesSave,
                saved: copy.lead.notesSaved,
                saving: copy.lead.saving,
              }}
              errors={errors}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
