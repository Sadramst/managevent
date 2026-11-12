import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio/StudioShell";
import { NOINDEX } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";

export const metadata: Metadata = { robots: NOINDEX };

/** The host's events for the switcher. A failure here must not take the whole studio down. */
async function loadSwitcherEvents(): Promise<{ id: string; title: string }[]> {
  try {
    const api = await getServerApi();
    const { items } = await api.events.list();
    return items.map((event) => ({ id: event.id, title: event.title }));
  } catch {
    return [];
  }
}

/**
 * Every `/studio/*` page: a signed-in host is required (signed out → `/sign-in?next=<the page
 * asked for>`), and the page renders inside the studio shell.
 */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { user } = await requireHost();
  const events = await loadSwitcherEvents();
  return (
    <StudioShell user={{ name: user.name, email: user.email }} events={events}>
      {children}
    </StudioShell>
  );
}
