import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";

interface RouteContext {
  params: Promise<{
    eventSlug: string;
    guestToken: string;
  }>;
}

function formatIcsDate(isoString: string): string {
  const date = new Date(isoString);
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
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
    : formatIcsDate(new Date(new Date(event.startsAt).getTime() + 5 * 60 * 60 * 1000).toISOString());

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
    `SUMMARY:${event.title.replace(/[,;]/g, "\\$&")}`,
    `DESCRIPTION:${event.content.headline.replace(/[,;]/g, "\\$&")}\\n\\nPersonal invitation for ${party.displayName}.\\nAccess details: ${guestUrl}`,
    `LOCATION:${`${event.venue.name}, ${event.venue.address}`.replace(/[,;]/g, "\\$&")}`,
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
