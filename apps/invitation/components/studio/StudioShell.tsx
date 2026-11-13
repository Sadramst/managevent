import { ChevronDown, LifeBuoy, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getInvitationShell, t } from "@managevent/i18n";
import { BrandLogo } from "@managevent/ui/brand";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Menu } from "@/components/ui/Menu";
import { routes, wwwLinks } from "@/lib/urls";
import { EventSwitcher, type EventSwitcherEvent } from "./EventSwitcher";

export interface StudioShellProps {
  /** The signed-in host (from `requireHost`). Only the name and email are shown. */
  user: { name: string; email: string };
  /** The host events for the switcher (id and title only). Empty when the list failed to load. */
  events: readonly EventSwitcherEvent[];
  /** The page. The shell renders `<main id="main">` around it. */
  children: ReactNode;
}

function initials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [email[0]];
  return letters.join("").toUpperCase();
}

/**
 * The Host Studio chrome: a sticky top bar (logo → `/studio`, event switcher, "New invitation",
 * account menu with sign out), the page inside `<main id="main">`, and a slim footer with the
 * legal links. Rendered once by `app/studio/layout.tsx`; pages never render it themselves.
 *
 * The event tab bar is separate (`StudioTabs`), rendered by `app/studio/[eventId]/layout.tsx`.
 */
export function StudioShell({ user, events, children }: StudioShellProps) {
  const copy = getInvitationShell("en");
  const studio = copy.studio;

  return (
    <>
      <a className="skip" href="#main">
        {studio.skip}
      </a>
      <header className="studio-bar">
        <div className="wrap studio-bar-inner">
          <Link className="studio-brand" href={routes.studio} aria-label={studio.brandHome}>
            <BrandLogo descriptor={studio.brandLabel} />
          </Link>
          <EventSwitcher
            events={events}
            copy={{
              switcherLabel: studio.switcherLabel,
              switcherEmpty: studio.switcherEmpty,
              homeLabel: studio.homeLabel,
              newEvent: studio.newEvent,
            }}
          />
          <div className="studio-bar-actions">
            <Menu
              label={`${studio.accountLabel}: ${user.name}`}
              summaryClassName="studio-account-toggle"
              summary={
                <>
                  <span className="studio-avatar" aria-hidden="true">
                    {initials(user.name, user.email)}
                  </span>
                  <span className="studio-account-name">{user.name}</span>
                  <ChevronDown aria-hidden="true" />
                </>
              }
            >
              <p className="menu-heading">{studio.signedInAs}</p>
              <p className="menu-text">
                <bdi>{user.email}</bdi>
              </p>
              <hr className="menu-sep" />
              <ul className="menu-list">
                <li>
                  <Link className="menu-item" href={routes.studio}>
                    {studio.homeLabel}
                  </Link>
                </li>
                <li>
                  <Link className="menu-item" href={routes.studioNew}>
                    <Plus className="icon" aria-hidden="true" />
                    {studio.newEvent}
                  </Link>
                </li>
                <li>
                  <a className="menu-item" href={wwwLinks.contact} rel="noopener">
                    <LifeBuoy className="icon" aria-hidden="true" />
                    {studio.help}
                  </a>
                </li>
              </ul>
              <hr className="menu-sep" />
              <SignOutButton
                label={copy.auth.signOut}
                pendingLabel={copy.auth.signingOut}
                failedLabel={copy.auth.errors.network}
                icon={<LogOut className="icon" aria-hidden="true" />}
              />
            </Menu>
          </div>
        </div>
      </header>
      <main id="main" className="studio-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="studio-foot">
        <div className="wrap cluster cluster-between">
          <a href="https://www.appilico.com.au/" rel="noopener">
            {t("en", "common.byAppilico")}
          </a>
          <nav className="cluster" aria-label={t("en", "marketing.launchFooterLegal")}>
            <a href={wwwLinks.privacy} rel="noopener">
              {t("en", "marketing.launchPrivacy")}
            </a>
            <a href={wwwLinks.terms} rel="noopener">
              {t("en", "marketing.launchTerms")}
            </a>
            <a href={wwwLinks.accessibility} rel="noopener">
              {t("en", "marketing.launchAccessibility")}
            </a>
            <a href={wwwLinks.contact} rel="noopener">
              {copy.footer.contactUs}
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
