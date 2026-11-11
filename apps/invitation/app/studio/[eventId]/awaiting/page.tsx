import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";
import {
  buildReminderText,
  formatDateAu,
  getAwaitingParties,
  getChaseCounts,
  getDeadlineStatus,
  getReminderMode,
} from "@/lib/rsvp-chase";
import { chaseCopy } from "@/lib/rsvp-chase-copy";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = {
  title: chaseCopy.pageTitle,
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

interface AwaitingPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function AwaitingRepliesPage({ params }: AwaitingPageProps) {
  const { eventId } = await params;
  // DECISION-NEEDED(PROD-INV-01): this route is as open as the existing studio routes.
  // It must inherit the host-access gate from the Fixer team's auth work once that lands.
  const event = invitationStore.getEventById(eventId);
  if (!event) notFound();

  const mode = getReminderMode(event);
  const counts = getChaseCounts(event);
  const awaiting = getAwaitingParties(event);
  const deadline = getDeadlineStatus(event, new Date());
  const deadlineDate = event.rsvpDeadline ? formatDateAu(event.rsvpDeadline, event.timeZone) : "";

  let deadlineText: string;
  if (deadline.kind === "no-deadline") deadlineText = chaseCopy.noDeadline;
  else if (mode === "memorial") deadlineText = chaseCopy.memorialRepliesRequested(deadlineDate);
  else if (deadline.kind === "open") deadlineText = chaseCopy.deadlineOpen(deadline.daysRemaining);
  else if (deadline.kind === "due-today") deadlineText = chaseCopy.deadlineDueToday;
  else deadlineText = chaseCopy.deadlineClosed(deadline.daysOverdue);

  const stats: Array<[string, number]> = [
    [chaseCopy.statAwaiting, counts.awaiting],
    [chaseCopy.statReplied, counts.replied],
    [chaseCopy.statTotal, counts.total],
  ];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/studio/${event.id}`}
          className="text-sm text-stone-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          {chaseCopy.backToStudio}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">{chaseCopy.pageTitle}</h1>
        <p className="mt-1 text-stone-700">{event.title}</p>
        <p className="mt-1 text-stone-700">
          {deadlineText}
          {mode !== "memorial" && deadlineDate ? ` (${deadlineDate})` : ""}
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-3 text-start">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-stone-300 bg-white p-3">
              <dt className="text-xs text-stone-700">{label}</dt>
              <dd className="text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {awaiting.length === 0 ? (
          <p className="mt-8">{chaseCopy.nobodyAwaiting}</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {awaiting.map((party) => {
              const text = buildReminderText(event, party, mode);
              const areaId = `msg-${party.id}`;
              return (
                <li key={party.id} className="rounded-lg border border-stone-300 bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-medium">{party.displayName}</h2>
                    <p className="text-sm text-stone-700">
                      {chaseCopy.seats(party.maxSeats)}
                      {party.tableLabel ? ` · ${chaseCopy.table(party.tableLabel)}` : ""}
                    </p>
                  </div>
                  <label htmlFor={areaId} className="mt-3 block text-sm text-stone-700">
                    {chaseCopy.messageLabel(party.displayName)}
                  </label>
                  <textarea
                    id={areaId}
                    readOnly
                    rows={6}
                    defaultValue={text}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-stone-50 p-2 text-start text-sm"
                  />
                  <div className="mt-2">
                    <CopyButton
                      text={text}
                      label={chaseCopy.copy}
                      ariaLabel={chaseCopy.copyAria(party.displayName)}
                      copiedLabel={chaseCopy.copied}
                      failedLabel={chaseCopy.copyFailed}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
