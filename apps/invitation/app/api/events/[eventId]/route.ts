import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import type { InvitationThemeId } from "@managevent/types";

const MEMORIAL_THEMES: InvitationThemeId[] = ["memorial-alabaster", "memorial-slate"];

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const event = invitationStore.getEventById(eventId);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const summary = invitationStore.getEventResponsesSummary(eventId);

    return NextResponse.json({
      success: true,
      event,
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const event = invitationStore.getEventById(eventId);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updates = await request.json();

    // Enforce memorial constraints
    if (event.experienceMode === "MEMORIAL") {
      if (updates.themeId && !MEMORIAL_THEMES.includes(updates.themeId)) {
        return NextResponse.json(
          { error: "Memorial events can only use memorial themes." },
          { status: 400 },
        );
      }
      if (updates.gateStyle && updates.gateStyle !== "plain-fade") {
        return NextResponse.json(
          { error: "Memorial events must use the plain-fade gate style." },
          { status: 400 },
        );
      }
    }

    const updatedEvent = invitationStore.updateEvent(eventId, updates);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
