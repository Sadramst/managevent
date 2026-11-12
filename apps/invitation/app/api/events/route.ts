import { NextResponse } from "next/server";
import { invitationStore } from "@/lib/invitation-store";
import type { InvitationThemeId, ExperienceMode } from "@managevent/types";

const MEMORIAL_THEMES: InvitationThemeId[] = ["memorial-alabaster", "memorial-slate"];

const SOLEMN_CEREMONY_SLUGS = new Set([
  "memorial-service",
  "celebration-of-life",
  "memorial",
  "funeral",
]);

export async function GET() {
  try {
    const events = invitationStore.getAllEvents();
    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 });
    }

    const ceremonySlug = typeof body.ceremonySlug === "string" ? body.ceremonySlug : "wedding";
    const isMemorialCeremony =
      SOLEMN_CEREMONY_SLUGS.has(ceremonySlug) || body.experienceMode === "MEMORIAL";

    const experienceMode: ExperienceMode = isMemorialCeremony ? "MEMORIAL" : "CELEBRATION";

    let themeId: InvitationThemeId = body.themeId || "emerald-botanic";
    if (isMemorialCeremony && !MEMORIAL_THEMES.includes(themeId)) {
      themeId = "memorial-alabaster";
    }

    const gateStyle = isMemorialCeremony ? "plain-fade" : body.gateStyle || "wax-seal";

    const startsAt =
      body.startsAt && !isNaN(Date.parse(body.startsAt))
        ? new Date(body.startsAt).toISOString()
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const createdEvent = invitationStore.createEvent({
      title,
      ceremonySlug,
      experienceMode,
      themeId,
      templateSlug: body.templateSlug || "custom-invitation",
      gateStyle,
      startsAt,
      timeZone: body.timeZone || "Australia/Perth",
      languages: ["en"],
      defaultLanguage: "en",
      venueName: body.venueName?.trim() || "The Celebration Venue",
      venueAddress: body.venueAddress?.trim() || "Perth, Western Australia",
      content: {
        headline: body.content?.headline?.trim() || "We invite you to celebrate with us.",
        subheadline:
          body.content?.subheadline?.trim() || "An evening of memories, food, and music.",
        coupleOrHostNames: body.content?.coupleOrHostNames?.trim() || title,
        invitationStory: body.content?.invitationStory || [
          "We are deeply delighted to invite our closest family and friends to celebrate this unforgettable milestone with us.",
        ],
        ...body.content,
      },
      parties:
        Array.isArray(body.parties) && body.parties.length > 0
          ? body.parties
          : [
              {
                name: "Honoured Guest",
                seats: 2,
              },
            ],
    });

    const primaryParty = createdEvent.parties[0];
    const primaryGuestUrl = primaryParty
      ? `/i/${createdEvent.slug}/${primaryParty.token}`
      : `/i/${createdEvent.slug}`;

    return NextResponse.json(
      {
        success: true,
        event: createdEvent,
        primaryGuestUrl,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create invitation event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
