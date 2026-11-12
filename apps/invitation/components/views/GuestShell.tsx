import type { ExperienceMode, InvitationThemeId } from "@managevent/types";
import { cx } from "@managevent/ui/brand";
import type { CSSProperties, ReactNode } from "react";
import { getGuestTheme } from "@/lib/guest/theme";
import "./guest.css";

export interface GuestShellProps {
  themeId: InvitationThemeId;
  experienceMode: ExperienceMode;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * The themed wrapper for every guest page (the invitation, the passes, the status pages).
 *
 * It sets the brand `--me-*` tokens from the invitation's theme, twice on purpose:
 * - on the wrapper, inline, so everything inside renders in the theme and the brand shell's
 *   derived tokens (rules, tints, shadows) recompute from it (`data-experience-mode` is the hook
 *   brand.css uses for that, and it also switches the shell to its Memorial Mode structure);
 * - on `:root`, from a small style element, so the body behind the page and anything rendered
 *   outside the wrapper (toasts) match instead of flashing the site's ivory.
 *
 * The <noscript> style hides the pieces that only work with JavaScript (gate, countdown, forms),
 * leaving the complete server-rendered invitation.
 */
export function GuestShell({ themeId, experienceMode, className, children }: GuestShellProps) {
  const theme = getGuestTheme(themeId, experienceMode);
  return (
    <div
      className={cx("inv", className)}
      data-theme={theme.id}
      data-tone={theme.tone}
      data-experience-mode={experienceMode === "MEMORIAL" ? "memorial" : "celebration"}
      style={theme.style as CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: theme.rootCss }} />
      <noscript>
        <style>{".inv-js-only{display:none!important}"}</style>
      </noscript>
      {children}
    </div>
  );
}

export interface GuestStatusProps {
  title: string;
  body: string;
  /** An optional way onwards, e.g. back to the invitation. */
  action?: { label: string; href: string } | undefined;
}

/**
 * A quiet, self-explanatory page for the moments there is no invitation to show (a link turned
 * off between two requests, or too many requests). It uses the calm theme because the event's
 * own theme is not known.
 */
export function GuestStatus({ title, body, action }: GuestStatusProps) {
  return (
    <GuestShell themeId="memorial-alabaster" experienceMode="MEMORIAL">
      <main id="main" className="inv-status">
        <div className="inv-status-card">
          <h1>{title}</h1>
          <p>{body}</p>
          {action ? (
            <a className="button button-secondary" href={action.href}>
              {action.label}
            </a>
          ) : null}
        </div>
      </main>
    </GuestShell>
  );
}
