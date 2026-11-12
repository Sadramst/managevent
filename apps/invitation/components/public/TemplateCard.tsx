import { fillCopy, getExperienceMode, type InvitationPublicCopy } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import type { DemoInvitation, InvitationTemplate } from "@managevent/validators";
import { Badge, buttonClass } from "@/components/ui";
import { createInvitationHref, samplePath } from "@/lib/public/links";
import { InvitationPreview } from "./InvitationPreview";

type TemplateSlug = keyof InvitationPublicCopy["templateNames"];

export interface TemplateCardProps {
  template: InvitationTemplate;
  /** The sample invitation for this template, when the API listed one. */
  demo?: DemoInvitation | undefined;
  signedIn: boolean;
  copy: InvitationPublicCopy;
  /** Heading level of the template name. */
  level?: 2 | 3;
}

/**
 * One template in the gallery: a preview in the template's own colours, what it costs, which
 * kind of event it is for, and the two things a visitor can do with it.
 *
 * "View sample" is a plain link, never `next/link`: a prefetch would spend the sample link's
 * rate limit for nothing.
 */
export function TemplateCard({ template, demo, signedIn, copy, level = 3 }: TemplateCardProps) {
  const names = copy.templateNames[template.slug as TemplateSlug];
  const theme = INVITATION_THEMES[template.defaultThemeId];
  const memorial = getExperienceMode({ experienceMode: template.mode }) === "MEMORIAL";
  const Heading = `h${level}` as "h2" | "h3";
  const planNote = memorial
    ? copy.templates.memorialNote
    : template.free
      ? copy.templates.freeNote
      : copy.templates.premiumNote;

  return (
    <article className="pub-template">
      <InvitationPreview
        themeId={demo?.themeId ?? template.defaultThemeId}
        hosts={demo?.hosts ?? copy.home.previewFallbackHosts}
        headline={demo?.headline ?? names.name}
        title={demo?.title}
      />
      <div className="pub-template-body">
        <ul className="pub-template-badges">
          <li>
            {/* A memorial template is never sold, so it carries no plan badge. */}
            {memorial ? (
              <Badge tone="neutral">{copy.shared.memorial}</Badge>
            ) : (
              <Badge tone="neutral">{copy.shared.celebration}</Badge>
            )}
          </li>
          {memorial ? null : (
            <li>
              {template.free ? (
                <Badge tone="success">{copy.shared.free}</Badge>
              ) : (
                <Badge tone="primary" solid>
                  {copy.shared.premium}
                </Badge>
              )}
            </li>
          )}
        </ul>
        <Heading className="pub-template-name">{names.name}</Heading>
        <p className="pub-template-summary">{names.summary}</p>
        <p className="pub-template-meta">
          <strong>{copy.templates.themeLabel}:</strong> {theme.name}. {planNote}.
        </p>
        <div className="pub-template-actions">
          {demo ? (
            <a
              className={buttonClass({ variant: "secondary", size: "small" })}
              href={samplePath(demo)}
              aria-label={fillCopy(copy.shared.viewSampleFor, { name: names.name })}
            >
              {copy.shared.viewSample}
            </a>
          ) : null}
          <a
            className={buttonClass({ size: "small" })}
            href={createInvitationHref(signedIn, template.slug)}
            aria-label={fillCopy(copy.shared.useTemplateFor, { name: names.name })}
          >
            {copy.shared.useTemplate}
          </a>
        </div>
      </div>
    </article>
  );
}
