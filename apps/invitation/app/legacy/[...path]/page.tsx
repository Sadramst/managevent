import { redirect, notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";

interface LegacyCatchAllProps {
  params: Promise<{ path: string[] }>;
}

export default async function LegacyCatchAllPage({ params }: LegacyCatchAllProps) {
  const { path } = await params;
  const tokenCandidate = path[path.length - 1];
  if (!tokenCandidate) {
    notFound();
  }

  // Try finding in all events
  for (const event of invitationStore.getAllEvents()) {
    const lookup = invitationStore.findGuestPartyByToken(event.slug, tokenCandidate);
    if (lookup) {
      redirect(`/i/${lookup.event.slug}/${lookup.party.token}`);
    }
  }

  notFound();
}
