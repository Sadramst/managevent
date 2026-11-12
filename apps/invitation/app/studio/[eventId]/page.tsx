import { notFound } from "next/navigation";
import { invitationStore } from "@/lib/invitation-store";
import { StudioEventClientView } from "@/components/studio/StudioEventClientView";

interface StudioEventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function StudioEventPage({ params }: StudioEventPageProps) {
  const { eventId } = await params;
  const event = invitationStore.getEventById(eventId);

  if (!event) {
    notFound();
  }

  const summary = invitationStore.getEventResponsesSummary(event.id);

  return <StudioEventClientView initialEvent={event} initialSummary={summary} />;
}
