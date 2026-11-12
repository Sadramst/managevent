import type { CSSProperties } from "react";
import { cx } from "@managevent/ui/brand";
import { INVITATION_THEMES, type InvitationThemeTokens } from "@managevent/ui/themes";

/**
 * A compact, faithful preview of the opening card of an invitation: the headline, who is
 * hosting, when and where, in the invitation's own colour theme.
 *
 * It is a preview for the host, not the guest page (that lives under `app/i/`): it shows no
 * schedule, map or reply form, and nothing in it is interactive. The colours and fonts come
 * from `@managevent/ui/themes`, set as CSS variables on the figure, so the same component
 * serves the wizard, the Design tab, the Details tab and the small thumbnails on cards.
 *
 * No hooks and no browser APIs: it renders on the server and inside client editors alike.
 * Every string arrives as a prop (`invitationStudioEn.preview`).
 */

export interface InvitationPreviewLabels {
  /** Accessible name of the figure, e.g. "Preview of the invitation". */
  label: string;
  headlinePlaceholder: string;
  hostsPlaceholder: string;
  datePlaceholder: string;
  venuePlaceholder: string;
  /** "Hosted by {hosts}" */
  hostedBy: string;
  inMemoryOf: string;
  rsvp: string;
  reply: string;
  coverAlt: string;
}

export interface InvitationPreviewProps {
  themeId: string;
  templateSlug: string;
  /** Memorial Mode: no arch, no ornament, "Reply" instead of "RSVP". */
  memorial: boolean;
  headline: string;
  subheadline?: string | undefined;
  hosts: string;
  honoureeName?: string | undefined;
  wording?: string | undefined;
  /** Already formatted, e.g. "Friday, 23 October 2026 at 4:30 PM". Empty shows a placeholder. */
  dateLine: string;
  venueName?: string | undefined;
  venueAddress?: string | undefined;
  /** HTTPS link supplied by the host. Anything else is ignored. */
  coverImageUrl?: string | null | undefined;
  labels: InvitationPreviewLabels;
  /** `thumb` is the small tile on template and event cards: headline and hosts only. */
  size?: "default" | "thumb" | undefined;
  className?: string | undefined;
}

const FALLBACK_THEME: InvitationThemeTokens = INVITATION_THEMES["royal-ivory"];

function themeFor(themeId: string): InvitationThemeTokens {
  return Object.hasOwn(INVITATION_THEMES, themeId)
    ? INVITATION_THEMES[themeId as keyof typeof INVITATION_THEMES]
    : FALLBACK_THEME;
}

/** Theme tokens as CSS variables. On a dark theme the heading takes the accent colour. */
function themeStyle(theme: InvitationThemeTokens): CSSProperties {
  const { colors } = theme;
  const heading = colors.accentInk === colors.bg ? colors.accent : colors.accentInk;
  return {
    "--pv-bg": colors.bg,
    "--pv-warm": colors.bgWarm,
    "--pv-surface": colors.surface,
    "--pv-ink": colors.ink,
    "--pv-muted": colors.inkMuted,
    "--pv-accent": colors.accent,
    "--pv-rule": colors.rule,
    "--pv-heading": heading,
    "--pv-display": theme.fonts.display,
    "--pv-body": theme.fonts.body,
  } as CSSProperties;
}

/** The frame each template gives the card. Memorial templates are always plain. */
function shapeFor(templateSlug: string, memorial: boolean): "arch" | "panel" | "plain" {
  if (memorial) return "plain";
  if (templateSlug === "royal-classic" || templateSlug === "celestial-evening") return "arch";
  return templateSlug === "botanic-garden" ? "panel" : "plain";
}

function Ornament({ templateSlug }: { templateSlug: string }) {
  if (templateSlug === "botanic-garden") {
    return (
      <svg className="inv-preview-ornament" viewBox="0 0 64 28" aria-hidden="true">
        <path d="M32 27V6" />
        <path d="M32 20c-7 0-12-4-14-10 7 0 12 4 14 10Z" />
        <path d="M32 20c7 0 12-4 14-10-7 0-12 4-14 10Z" />
        <path d="M32 11c-4-1-6-4-6-8 4 1 6 4 6 8Z" />
        <path d="M32 11c4-1 6-4 6-8-4 1-6 4-6 8Z" />
      </svg>
    );
  }
  if (templateSlug === "celestial-evening") {
    return (
      <svg className="inv-preview-ornament" viewBox="0 0 64 28" aria-hidden="true">
        <path d="M32 4l2.4 7.6L42 14l-7.6 2.4L32 24l-2.4-7.6L22 14l7.6-2.4Z" />
        <path d="M12 9l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
        <path d="M52 9l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
      </svg>
    );
  }
  if (templateSlug === "modern-minimal") {
    return (
      <svg className="inv-preview-ornament" viewBox="0 0 64 28" aria-hidden="true">
        <path d="M14 14h36" />
      </svg>
    );
  }
  return (
    <svg className="inv-preview-ornament" viewBox="0 0 64 28" aria-hidden="true">
      <path d="M22 27V13a10 10 0 0 1 20 0v14" />
      <path d="M27 27V14a5 5 0 0 1 10 0v13" />
      <path d="M16 27h32" />
    </svg>
  );
}

function isHttps(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

export function InvitationPreview({
  themeId,
  templateSlug,
  memorial,
  headline,
  subheadline,
  hosts,
  honoureeName,
  wording,
  dateLine,
  venueName,
  venueAddress,
  coverImageUrl,
  labels,
  size = "default",
  className,
}: InvitationPreviewProps) {
  const theme = themeFor(themeId);
  const thumb = size === "thumb";
  const headlineText = headline.trim();
  const hostsText = hosts.trim();
  const honouree = honoureeName?.trim() ?? "";
  const venue = venueName?.trim() ?? "";
  const address = venueAddress?.trim() ?? "";
  const lines = (wording ?? "").trim();
  const sub = subheadline?.trim() ?? "";

  return (
    <figure
      className={cx("inv-preview", className)}
      data-size={size}
      data-shape={shapeFor(templateSlug, memorial)}
      data-template={templateSlug}
      style={themeStyle(theme)}
      aria-label={thumb ? undefined : labels.label}
      aria-hidden={thumb ? true : undefined}
    >
      <div className="inv-preview-card">
        {!thumb && isHttps(coverImageUrl) ? (
          <img
            className="inv-preview-cover"
            src={coverImageUrl}
            alt={labels.coverAlt}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : memorial ? null : (
          <Ornament templateSlug={templateSlug} />
        )}

        {memorial && honouree ? (
          <p className="inv-preview-memory">
            <span>{labels.inMemoryOf}</span>
            <strong>{honouree}</strong>
          </p>
        ) : null}

        <p className="inv-preview-headline" data-placeholder={headlineText ? undefined : true}>
          {headlineText || labels.headlinePlaceholder}
        </p>
        {!thumb && sub ? <p className="inv-preview-sub">{sub}</p> : null}

        <span className="inv-preview-rule" aria-hidden="true" />

        {thumb ? (
          <p className="inv-preview-meta" data-placeholder={hostsText ? undefined : true}>
            {hostsText || labels.hostsPlaceholder}
          </p>
        ) : (
          <>
            <p className="inv-preview-when" data-placeholder={dateLine ? undefined : true}>
              {dateLine || labels.datePlaceholder}
            </p>
            <p className="inv-preview-where" data-placeholder={venue ? undefined : true}>
              <strong>{venue || labels.venuePlaceholder}</strong>
              {address ? <span>{address}</span> : null}
            </p>
            {lines ? <p className="inv-preview-wording">{lines}</p> : null}
            <p className="inv-preview-meta" data-placeholder={hostsText ? undefined : true}>
              {labels.hostedBy.replace("{hosts}", hostsText || labels.hostsPlaceholder)}
            </p>
            <span className="inv-preview-button" aria-hidden="true">
              {memorial ? labels.reply : labels.rsvp}
            </span>
          </>
        )}
      </div>
    </figure>
  );
}
