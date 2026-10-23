import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import type { RsvpSubmissionPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RsvpSubmissionPayload;

    if (!payload.guestToken || !payload.status) {
      return NextResponse.json(
        { error: "Missing guestToken or status in RSVP submission." },
        { status: 400 },
      );
    }

    const updatedParty = invitationStore.submitRsvp(payload);

    if (!updatedParty) {
      return NextResponse.json(
        { error: "Guest party or token could not be verified." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "RSVP response recorded successfully.",
      party: updatedParty,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
