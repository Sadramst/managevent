import type { AdminPagesCopy } from "@managevent/i18n";
import { BrandLogo } from "@managevent/ui/brand";
import type { StaffUser } from "../lib/admin/server";

/**
 * The console's header bar: logo, the one section that exists (Enquiries), who is signed in and
 * the sign-out button. Sign-out is a plain form post, so it works without JavaScript.
 */
export function AdminHeader({
  copy,
  user,
  onInbox,
}: {
  copy: AdminPagesCopy;
  user: StaffUser;
  /** True on the inbox itself, where the section link is the current page. */
  onInbox: boolean;
}) {
  return (
    <header className="console-bar">
      <div className="wrap console-bar-inner">
        <a className="console-brand" href="/admin">
          <BrandLogo size="sm" descriptor={copy.shell.productLabel} />
        </a>
        <nav className="console-nav" aria-label={copy.shell.navLabel}>
          <a href="/admin" aria-current={onInbox ? "page" : undefined}>
            {copy.shell.enquiries}
          </a>
        </nav>
        <p className="console-account" data-testid="signed-in-user">
          <span className="sr-only">{copy.shell.signedInAs} </span>
          <span className="console-account-name">{user.name}</span>
          <span className="console-account-role">{copy.roles[user.role]}</span>
        </p>
        <form className="console-sign-out" method="post" action="/admin/sign-out">
          <button type="submit" className="button button-secondary button-small">
            {copy.shell.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
