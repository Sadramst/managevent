import type { CSSProperties } from "react";
import type { InvitationThemeId } from "@managevent/types";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { ArchMark } from "./kit";

export interface InvitationPreviewProps {
  themeId: InvitationThemeId;
  /** The "hosted by" line of the invitation. */
  hosts: string;
  /** The main line: the couple, the person, the occasion. */
  headline: string;
  /** The event title, shown under the rule. */
  title?: string | undefined;
  className?: string;
}

const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** True when every word of `title` already appears in `headline`. */
export function repeats(title: string, headline: string): boolean {
  const seen = new Set(words(headline));
  return words(title).every((word) => seen.has(word));
}

/**
 * A small invitation drawn in its own theme: the colours, display font and ornament come from
 * `@managevent/ui/themes`, the words from the sample invitation the API lists
 * (`GET /v1/public/demos`). It is a picture of the design, not the guest page itself, so it
 * shows no date, place or guest name.
 *
 * Guest themes are the one place this app uses colours outside the brand tokens; they are
 * passed as custom properties and never written into CSS.
 */
export function InvitationPreview({
  themeId,
  hosts,
  headline,
  title,
  className,
}: InvitationPreviewProps) {
  const theme = INVITATION_THEMES[themeId];
  const style = {
    "--inv-bg": theme.colors.bg,
    "--inv-surface": theme.colors.surface,
    "--inv-ink": theme.colors.ink,
    "--inv-ink-muted": theme.colors.inkMuted,
    "--inv-accent": theme.colors.accent,
    "--inv-rule": theme.colors.rule,
    "--inv-font-display": theme.fonts.display,
  } as CSSProperties;
  // Memorial themes have no ornament and keep a plain rectangle (MEMORIAL_MODE.md).
  const arch = theme.mode === "celebration" && theme.ornaments !== "none";
  // A title that only repeats the headline ("In memory of Arthur Bennett" under "In loving
  // memory of Arthur James Bennett") adds nothing to a small card.
  const showTitle = Boolean(title) && !repeats(title ?? "", headline);

  return (
    <div
      className={className ? `pub-inv ${className}` : "pub-inv"}
      data-shape={arch ? "arch" : "plain"}
      style={style}
    >
      <div className="pub-inv-sheet">
        {arch ? <ArchMark className="pub-inv-mark" /> : null}
        <p className="pub-inv-hosts">{hosts}</p>
        <p className="pub-inv-headline">{headline}</p>
        {showTitle ? (
          <>
            <span className="pub-inv-rule" aria-hidden="true" />
            <p className="pub-inv-title">{title}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
