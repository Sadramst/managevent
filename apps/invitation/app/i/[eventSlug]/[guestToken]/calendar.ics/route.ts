import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import { formatCeremonyDate } from "@/lib/i18n";
import { escapeIcsText, formatIcsDate } from "./ics-helpers";

interface RouteContext {
  params: Promise<{
    eventSlug: string;
    guestToken: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { eventSlug, guestToken } = await context.params;
  const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestToken);

  if (!lookup) {
    return new NextResponse("Invitation not found", { status: 404 });
  }

  const { event, party } = lookup;
  const startIcs = formatIcsDate(event.startsAt);
  const endIcs = event.endsAt
    ? formatIcsDate(event.endsAt)
    : formatIcsDate(
        new Date(new Date(event.startsAt).getTime() + 5 * 60 * 60 * 1000).toISOString(),
      );

  const localWhen = formatCeremonyDate(event.startsAt, "en", {
    includeTime: true,
    includeWeekday: true,
    timeZone: event.timeZone,
  });
  const origin = new URL(request.url).origin;
  const guestUrl = `${origin}/i/${event.slug}/${party.token}`;

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Managevent Australia//Digital Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:evt_${event.id}_${party.id}@managevent.com.au`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${startIcs}`,
    `DTEND:${endIcs}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.content.headline)}\\n\\n${escapeIcsText(`When: ${localWhen}`)}\\nPersonal invitation for ${escapeIcsText(party.displayName)}.\\nAccess details: ${escapeIcsText(guestUrl)}`,
    `LOCATION:${escapeIcsText(`${event.venue.name}, ${event.venue.address}`)}`,
    `URL:${guestUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsPayload = icsLines.join("\r\n");

  return new NextResponse(icsPayload, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
