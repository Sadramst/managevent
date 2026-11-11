import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { invitationStore } from "@/lib/invitation-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

interface LegacyAnniversaryProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LegacyAnniversaryPage({
  params,
  searchParams,
}: LegacyAnniversaryProps) {
  const { slug } = await params;
  const query = await searchParams;

  // Find guest in the anniversary event by legacy slug or token
  const lookup = invitationStore.findGuestPartyByToken("anniversary", slug);

  if (!lookup) {
    notFound();
  }

  const { event, party } = lookup;

  // Build query string to preserve lang or other params
  const search = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === "string") {
      search.set(key, val);
    } else if (Array.isArray(val)) {
      for (const item of val) search.append(key, item);
    }
  }

  const queryString = search.toString() ? `?${search.toString()}` : "";
  redirect(`/i/${event.slug}/${party.token}${queryString}`);
}
