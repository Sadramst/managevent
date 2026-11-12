import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import type { GuestParty } from "@/lib/types";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const event = invitationStore.getEventById(eventId);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();

    // Check if batch import
    if (Array.isArray(body.parties)) {
      const addedParties: GuestParty[] = [];
      for (const p of body.parties) {
        if (!p.name || typeof p.name !== "string" || !p.name.trim()) continue;
        const seats = typeof p.seats === "number" && p.seats > 0 ? p.seats : 1;
        const tags = Array.isArray(p.tags) ? p.tags : ["General"];
        const newParty = invitationStore.addPartyToEvent(
          eventId,
          p.name.trim(),
          seats,
          tags,
          p.tableLabel,
        );
        if (newParty) addedParties.push(newParty);
      }

      const summary = invitationStore.getEventResponsesSummary(eventId);
      return NextResponse.json(
        {
          success: true,
          addedCount: addedParties.length,
          parties: addedParties,
          event: invitationStore.getEventById(eventId),
          summary,
        },
        { status: 201 },
      );
    }

    // Single party creation
    const partyName = typeof body.partyName === "string" ? body.partyName.trim() : "";
    if (!partyName) {
      return NextResponse.json({ error: "Party name is required." }, { status: 400 });
    }

    const seats = typeof body.seats === "number" && body.seats > 0 ? body.seats : 2;
    const tags = Array.isArray(body.tags) ? body.tags : ["General"];
    const tableLabel = typeof body.tableLabel === "string" ? body.tableLabel.trim() : undefined;

    const newParty = invitationStore.addPartyToEvent(eventId, partyName, seats, tags, tableLabel);

    if (!newParty) {
      return NextResponse.json({ error: "Failed to create party." }, { status: 500 });
    }

    const summary = invitationStore.getEventResponsesSummary(eventId);

    return NextResponse.json(
      {
        success: true,
        party: newParty,
        event: invitationStore.getEventById(eventId),
        summary,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add party";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
