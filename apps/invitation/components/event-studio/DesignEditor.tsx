"use client";

import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useState } from "react";
import type { InvitationStudioCopy } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import {
  InvitationPreview,
  type InvitationPreviewLabels,
} from "@/components/invitation-preview/InvitationPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { updateInvitationAction } from "@/lib/event-studio/actions";
import type { GateOption, TemplateOption, ThemeOption } from "@/lib/event-studio/catalog";
import { settle } from "@/lib/client-action";
import {
  applyTemplate,
  type DesignEntitlements,
  type DesignSelection,
  isGateLocked,
  isTemplateLocked,
  isThemeLocked,
  lockedSelections,
} from "@/lib/event-studio/design-rules";
import { fill } from "@/lib/event-studio/local-date";
import { SaveBar } from "./SaveBar";
import { UnsavedGuard, type UnsavedGuardCopy } from "./UnsavedGuard";

export interface DesignPreviewContent {
  headline: string;
  subheadline: string;
  hosts: string;
  honoureeName?: string | undefined;
  wording: string;
  dateLine: string;
  venueName?: string | undefined;
  venueAddress?: string | undefined;
  coverImageUrl: string | null;
}

export interface DesignEditorProps {
  eventId: string;
  memorial: boolean;
  /** False for a view-only co-host: the pickers still preview, nothing can be saved. */
  canEdit: boolean;
  initial: DesignSelection;
  /** `invitation.updatedAt` as loaded, sent back as `expectedUpdatedAt`. */
  updatedAt: string;
  entitlements: DesignEntitlements;
  /** Templates and colour themes of this event's mode only. */
  templates: TemplateOption[];
  themes: ThemeOption[];
  gateStyles: GateOption[];
  content: DesignPreviewContent;
  /** The plan section of the Settings tab. */
  planHref: string;
  copy: {
    design: InvitationStudioCopy["design"];
    preview: InvitationPreviewLabels & { title: string; note: string };
    premium: string;
    saveBar: { saving: string; preview: string };
    unsaved: UnsavedGuardCopy;
    staleError: string;
    networkError: string;
  };
}

function sameSelection(a: DesignSelection, b: DesignSelection): boolean {
  return (
    a.templateSlug === b.templateSlug && a.themeId === b.themeId && a.gateStyle === b.gateStyle
  );
}

/** Three dots in a theme's own colours (surface, accent, heading). Decorative. */
function ThemeDots({ themeId }: { themeId: string }) {
  if (!Object.hasOwn(INVITATION_THEMES, themeId)) return null;
  const { colors } = INVITATION_THEMES[themeId as keyof typeof INVITATION_THEMES];
  const heading = colors.accentInk === colors.bg ? colors.ink : colors.accentInk;
  return (
    <span className="es-dots" aria-hidden="true">
      {[colors.bg, colors.accent, heading].map((color, index) => (
        <span key={index} style={{ "--dot": color } as CSSProperties} />
      ))}
    </span>
  );
}

/** A small drawing of each opening style, in the selected theme's seal and ribbon colours. */
function GateGlyph({ gate, themeId }: { gate: string; themeId: string }) {
  const theme = Object.hasOwn(INVITATION_THEMES, themeId)
    ? INVITATION_THEMES[themeId as keyof typeof INVITATION_THEMES]
    : INVITATION_THEMES["royal-ivory"];
  const style = {
    "--gate-bg": theme.colors.bgWarm,
    "--gate-seal": theme.gate.sealColor,
    "--gate-ribbon": theme.gate.ribbonColor,
    "--gate-line": theme.colors.rule,
  } as CSSProperties;
  return (
    <svg className="es-gate-glyph" viewBox="0 0 72 48" style={style} aria-hidden="true">
      <rect className="es-gate-bg" x="1" y="1" width="70" height="46" rx="5" />
      {gate === "wax-seal" ? (
        <>
          <path className="es-gate-line" d="M1 6l35 22L71 6" />
          <circle className="es-gate-seal" cx="36" cy="28" r="8" />
        </>
      ) : gate === "ribbon" ? (
        <>
          <rect className="es-gate-ribbon" x="1" y="20" width="70" height="8" />
          <rect className="es-gate-ribbon" x="32" y="1" width="8" height="46" />
          <circle className="es-gate-seal" cx="36" cy="24" r="6" />
        </>
      ) : gate === "arch" ? (
        <>
          <path className="es-gate-line" d="M18 47V22a18 18 0 0 1 36 0v25" />
          <path className="es-gate-line" d="M36 4v43" />
        </>
      ) : (
        <>
          <path className="es-gate-line" d="M18 18h36M24 26h24M28 34h16" />
        </>
      )}
    </svg>
  );
}

/**
 * The Design tab: pick a template, the colours and how the invitation opens, with a live
 * preview. Premium options can be previewed on the free plan; saving them is blocked with an
 * explanation and a link to the plan. The API has the last word (`FEATURE_NOT_IN_PLAN`).
 */
export function DesignEditor({
  eventId,
  memorial,
  canEdit,
  initial,
  updatedAt,
  entitlements,
  templates,
  themes,
  gateStyles,
  content,
  planHref,
  copy,
}: DesignEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const text = copy.design;
  const [saved, setSaved] = useState(initial);
  const [selection, setSelection] = useState(initial);
  const [stamp, setStamp] = useState(updatedAt);
  const [pending, setPending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<{ message: string; kind: "plan" | "stale" | "other" } | null>(
    null,
  );

  const dirty = !sameSelection(selection, saved);
  const template = templates.find((item) => item.slug === selection.templateSlug);
  const locked = lockedSelections(selection, { templates, themes, gateStyles }, entitlements);

  const choose = (next: DesignSelection) => {
    setSelection(next);
    setError(null);
  };

  const save = async () => {
    if (!dirty || pending || locked.length > 0) return;
    setPending(true);
    setError(null);
    const result = await settle(
      () =>
        updateInvitationAction(eventId, {
          templateSlug: selection.templateSlug,
          themeId: selection.themeId,
          gateStyle: selection.gateStyle,
          expectedUpdatedAt: stamp,
        }),
      copy.networkError,
    );
    setPending(false);
    if (!result) return;
    if (result.ok) {
      setSaved(selection);
      setStamp(result.data.invitationUpdatedAt);
      toast.show(text.saved, { tone: "success" });
      router.refresh();
      return;
    }
    if (result.code === "FEATURE_NOT_IN_PLAN") {
      setError({ message: text.planDenied, kind: "plan" });
    } else if (result.code === "STALE_WRITE") {
      setError({ message: copy.staleError, kind: "stale" });
    } else {
      setError({ message: result.message, kind: "other" });
    }
  };

  const preview = (
    <InvitationPreview
      themeId={selection.themeId}
      templateSlug={selection.templateSlug}
      memorial={memorial}
      headline={content.headline}
      subheadline={content.subheadline}
      hosts={content.hosts}
      honoureeName={content.honoureeName}
      wording={content.wording}
      dateLine={content.dateLine}
      venueName={content.venueName}
      venueAddress={content.venueAddress}
      coverImageUrl={content.coverImageUrl}
      labels={copy.preview}
    />
  );

  return (
    <div className="es-editor">
      <UnsavedGuard dirty={dirty} copy={copy.unsaved} />

      <div className="es-editor-main">
        {error ? (
          <Notice tone="danger" role="alert" className="es-gap">
            <p>{error.message}</p>
            {error.kind === "plan" ? (
              <p>
                <Link className="link" href={planHref}>
                  {text.seePlan}
                </Link>
              </p>
            ) : null}
            {error.kind === "stale" ? (
              <p>
                <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
                  {text.reload}
                </Button>
              </p>
            ) : null}
          </Notice>
        ) : null}

        <fieldset className="es-fieldset">
          <legend>{text.templateLegend}</legend>
          <p className="help">{text.templateLead}</p>
          <div className="es-choices">
            {templates.map((item) => {
              const isLocked = isTemplateLocked(item, entitlements);
              const selected = item.slug === selection.templateSlug;
              return (
                <div
                  key={item.slug}
                  className="es-choice"
                  data-selected={selected ? true : undefined}
                >
                  <label className="es-choice-label">
                    <input
                      type="radio"
                      name="design-template"
                      value={item.slug}
                      checked={selected}
                      onChange={() => choose(applyTemplate(item))}
                    />
                    <InvitationPreview
                      size="thumb"
                      themeId={item.defaultThemeId}
                      templateSlug={item.slug}
                      memorial={memorial}
                      headline={content.headline}
                      hosts={content.hosts}
                      dateLine=""
                      labels={copy.preview}
                    />
                    <span className="es-choice-text">
                      <span className="es-choice-name">
                        {item.name}
                        {isLocked ? (
                          <Badge>
                            <Lock className="icon" aria-hidden="true" />
                            {copy.premium}
                          </Badge>
                        ) : null}
                        {item.slug === saved.templateSlug ? (
                          <Badge tone="neutral">{text.current}</Badge>
                        ) : null}
                      </span>
                      <span className="es-choice-desc">{item.description}</span>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="es-fieldset">
          <legend>{text.themeLegend}</legend>
          <div className="es-swatches">
            {themes.map((item) => {
              const isLocked = isThemeLocked(item, entitlements);
              const selected = item.id === selection.themeId;
              return (
                <label
                  key={item.id}
                  className="es-swatch"
                  data-selected={selected ? true : undefined}
                >
                  <input
                    type="radio"
                    name="design-theme"
                    value={item.id}
                    checked={selected}
                    onChange={() => choose({ ...selection, themeId: item.id })}
                  />
                  <ThemeDots themeId={item.id} />
                  <span className="es-swatch-name">{item.name}</span>
                  {isLocked ? (
                    <Badge>
                      <Lock className="icon" aria-hidden="true" />
                      {copy.premium}
                    </Badge>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {memorial ? (
          <div className="es-fieldset">
            <p className="es-legend">{text.gateLegend}</p>
            <p className="muted">{text.gateMemorial}</p>
          </div>
        ) : (
          <fieldset className="es-fieldset">
            <legend>{text.gateLegend}</legend>
            <p className="help">{text.gateLead}</p>
            <div className="es-gates">
              {gateStyles.map((item) => {
                const isLocked = isGateLocked(item, template, entitlements);
                const selected = item.id === selection.gateStyle;
                return (
                  <label
                    key={item.id}
                    className="es-gate"
                    data-selected={selected ? true : undefined}
                  >
                    <input
                      type="radio"
                      name="design-gate"
                      value={item.id}
                      checked={selected}
                      onChange={() => choose({ ...selection, gateStyle: item.id })}
                    />
                    <GateGlyph gate={item.id} themeId={selection.themeId} />
                    <span className="es-choice-text">
                      <span className="es-choice-name">
                        {item.name}
                        {isLocked ? (
                          <Badge>
                            <Lock className="icon" aria-hidden="true" />
                            {copy.premium}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="es-choice-desc">{item.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <aside className="es-editor-aside" aria-label={copy.preview.title}>
        {locked.length > 0 ? (
          <Notice tone="warning" role="status" title={text.lockedTitle}>
            <p>
              {fill(locked.length === 1 ? text.lockedBodyOne : text.lockedBody, {
                names: locked.join(", "),
              })}
            </p>
            <p>
              <Link className="link" href={planHref}>
                {text.seePlan}
              </Link>
            </p>
          </Notice>
        ) : null}
        <p className="es-aside-title">{copy.preview.title}</p>
        {preview}
        <p className="notice">{copy.preview.note}</p>
      </aside>

      {canEdit ? (
        <SaveBar
          dirty={dirty}
          pending={pending}
          saveDisabled={locked.length > 0}
          blockedNote={locked.length > 0 ? text.lockedShort : undefined}
          onSave={save}
          onDiscard={() => choose(saved)}
          labels={{
            unsaved: text.unsaved,
            saved: text.upToDate,
            save: text.save,
            saving: copy.saveBar.saving,
            discard: text.discard,
          }}
        >
          <Button
            variant="ghost"
            className="es-narrow-only"
            onClick={() => setPreviewOpen(true)}
            disabled={pending}
          >
            <Eye className="icon" aria-hidden="true" />
            {copy.saveBar.preview}
          </Button>
        </SaveBar>
      ) : null}

      <Drawer open={previewOpen} onClose={() => setPreviewOpen(false)} title={copy.preview.title}>
        {preview}
        <p className="notice es-gap-top">{copy.preview.note}</p>
      </Drawer>
    </div>
  );
}
