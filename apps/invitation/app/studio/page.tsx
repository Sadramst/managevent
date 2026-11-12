import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { fillCopy, getInvitationStudio } from "@managevent/i18n";
import { INVITATION_PLANS } from "@managevent/payments/plans";
import { Section } from "@managevent/ui/brand";
import { EventCard } from "@/components/event-studio/EventCard";
import { InvitationPreview } from "@/components/invitation-preview/InvitationPreview";
import { buttonClass, Notice } from "@/components/ui";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const copy = getInvitationStudio("en");

export const metadata: Metadata = privateMetadata(copy.events.title);

/**
 * My events: every invitation the host owns or co-hosts (`GET /v1/events`), soonest first, with
 * past events under their own heading. A host with no events is invited to create one.
 */
export default async function StudioHomePage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[] }>;
}) {
  await requireHost();
  const [{ deleted }, api] = await Promise.all([searchParams, getServerApi()]);
  const { items } = await api.events.list();
  const text = copy.events;

  const now = Date.now();
  const byStart = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const isPast = (startsAt: string) => Date.parse(startsAt) < now;
  const upcoming = byStart.filter((event) => !isPast(event.startsAt));
  const past = byStart.filter((event) => isPast(event.startsAt)).reverse();

  return (
    <Section tight>
      <div className="page-header es-page-header">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 className="page-title">{text.title}</h1>
          {items.length > 0 ? <p className="lead es-page-lead">{text.lead}</p> : null}
        </div>
        {items.length > 0 ? (
          <Link className={buttonClass()} href={routes.studioNew}>
            <Plus className="icon" aria-hidden="true" />
            {text.newEvent}
          </Link>
        ) : null}
      </div>

      {deleted === "1" ? (
        <Notice tone="success" role="status" className="es-gap">
          {text.deleted}
        </Notice>
      ) : null}

      {items.length === 0 ? (
        <div className="panel es-welcome">
          <div className="es-welcome-text">
            <h2>{text.empty.title}</h2>
            <p className="lead">
              {fillCopy(text.empty.body, { guests: INVITATION_PLANS.FREE.maxGuests })}
            </p>
            <ol className="es-welcome-steps">
              {text.empty.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="cluster">
              <Link className={buttonClass({ size: "large" })} href={routes.studioNew}>
                {text.empty.action}
              </Link>
              <Link className={buttonClass({ variant: "ghost" })} href={routes.templates}>
                {text.empty.templates}
              </Link>
            </div>
          </div>
          <InvitationPreview
            className="es-welcome-preview"
            themeId="royal-ivory"
            templateSlug="royal-classic"
            memorial={false}
            headline=""
            hosts=""
            dateLine=""
            labels={copy.preview}
          />
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section aria-labelledby="events-upcoming">
              <h2 id="events-upcoming" className={past.length > 0 ? "es-list-title" : "sr-only"}>
                {text.upcoming}
              </h2>
              <ul className="es-events">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} past={false} copy={copy} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {past.length > 0 ? (
            <section aria-labelledby="events-past" className="es-list-section">
              <h2 id="events-past" className="es-list-title">
                {text.past}
              </h2>
              <ul className="es-events">
                {past.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} past copy={copy} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Section>
  );
}
