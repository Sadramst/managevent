import Link from "next/link";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { routes } from "@/lib/urls";

/**
 * The two views under the Responses tab: everything that has come in, and who is still to
 * answer. Links between pages (`aria-current="page"`), not an ARIA tablist.
 */
export function ResponsesNav({
  eventId,
  current,
  copy,
}: {
  eventId: string;
  current: "responses" | "awaiting";
  copy: InvitationStudioGuestsCopy["responses"]["nav"];
}) {
  return (
    <nav className="tabs sb-subnav" aria-label={copy.label}>
      <Link
        className="tab"
        href={routes.eventTab(eventId, "responses")}
        aria-current={current === "responses" ? "page" : undefined}
      >
        {copy.all}
      </Link>
      <Link
        className="tab"
        href={routes.eventTab(eventId, "awaiting")}
        aria-current={current === "awaiting" ? "page" : undefined}
      >
        {copy.awaiting}
      </Link>
    </nav>
  );
}
