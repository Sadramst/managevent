import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import { generateGuestsBomCsv, type CsvGuestExportRow } from "@/lib/csv-helper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return new NextResponse("Missing eventId parameter", { status: 400 });
  }

  const event = invitationStore.getEventById(eventId);
  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;

  const exportRows: CsvGuestExportRow[] = [];

  for (const party of event.parties) {
    const inviteUrl = `${origin}/i/${event.slug}/${party.token}`;

    for (const member of party.members) {
      exportRows.push({
        partyName: party.displayName,
        guestName: member.name,
        isChild: Boolean(member.isChild),
        status: member.status,
        table: party.tableLabel || "",
        seats: party.maxSeats,
        dietary: member.dietary && member.dietary.length > 0 ? member.dietary.join(", ") : "NONE",
        allergyNotes: member.allergyNotes || "",
        tags: party.tags.join(", "),
        inviteUrl,
        notes: party.notes || "",
      });
    }
  }

  const csvContent = generateGuestsBomCsv(exportRows);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="managevent_guests_${event.slug}.csv"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
