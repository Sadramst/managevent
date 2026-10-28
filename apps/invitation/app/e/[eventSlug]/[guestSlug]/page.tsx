import { redirect, notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";

interface LegacyAppilicoEventProps {
  params: Promise<{
    eventSlug: string;
    guestSlug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LegacyAppilicoEventPage({
  params,
  searchParams,
}: LegacyAppilicoEventProps) {
  const { eventSlug, guestSlug } = await params;
  const query = await searchParams;

  const lookup = invitationStore.findGuestPartyByToken(eventSlug, guestSlug);

  if (!lookup) {
    notFound();
  }

  const { event, party } = lookup;

  const search = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === "string") {
      search.set(key, val);
    }
  }

  const queryString = search.toString() ? `?${search.toString()}` : "";
  redirect(`/i/${event.slug}/${party.token}${queryString}`);
}
