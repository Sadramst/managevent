"use client";

import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import type { InvitationStudioCopy } from "@managevent/i18n";
import type { InvitationContent } from "@managevent/validators";
import {
  InvitationPreview,
  type InvitationPreviewLabels,
} from "@/components/invitation-preview/InvitationPreview";
import type { ActionFailure } from "@/lib/action-result";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { updateEventAction, updateInvitationAction } from "@/lib/event-studio/actions";
import type { TimeZoneOption } from "@/lib/event-studio/catalog";
import { settle } from "@/lib/client-action";
import {
  checkHttpsUrl,
  CONTENT_LIMITS,
  type ContentForm,
  type EventForm,
  eventUpdateFrom,
  type FormErrors,
  fromContentForm,
  moveItem,
  newRowId,
  toContentForm,
  validateContentForm,
  validateEventForm,
} from "@/lib/event-studio/content-form";
import { type DateNames, fill, formatDateTimeInputs } from "@/lib/event-studio/local-date";
import { SaveBar } from "./SaveBar";
import { UnsavedGuard, type UnsavedGuardCopy } from "./UnsavedGuard";

export interface ContentEditorProps {
  eventId: string;
  memorial: boolean;
  /** False for a view-only co-host: the fields are read-only and there is no save bar. */
  canEdit: boolean;
  content: InvitationContent;
  /** `invitation.updatedAt` as loaded, sent back as `expectedUpdatedAt`. */
  updatedAt: string;
  event: EventForm;
  timeZones: TimeZoneOption[];
  design: { themeId: string; templateSlug: string };
  copy: {
    content: InvitationStudioCopy["content"];
    preview: InvitationPreviewLabels & { title: string; note: string };
    dateNames: DateNames;
    unsaved: UnsavedGuardCopy;
    optional: string;
    networkError: string;
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Move up, move down and remove for one row of a list editor. */
function RowTools({
  label,
  index,
  count,
  onMove,
  onRemove,
  copy,
  disabled,
}: {
  /** What the row is called, e.g. "Schedule item 2". */
  label: string;
  index: number;
  count: number;
  onMove?: ((delta: -1 | 1) => void) | undefined;
  onRemove: () => void;
  copy: InvitationStudioCopy["content"]["list"];
  disabled: boolean;
}) {
  return (
    <div className="es-row-tools">
      {onMove ? (
        <>
          <button
            type="button"
            className="icon-button"
            aria-label={fill(copy.moveUp, { item: label })}
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={fill(copy.moveDown, { item: label })}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="icon-button"
        aria-label={fill(copy.remove, { item: label })}
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}

function EditorSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card es-section" aria-labelledby={`${id}-title`}>
      <div className="es-section-head">
        <h2 id={`${id}-title`} className="es-section-title">
          {title}
        </h2>
        {lead ? <p className="muted">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A small look at a photo link, so a wrong link is obvious before it is saved. */
function PhotoThumb({ url, alt, brokenText }: { url: string; alt: string; brokenText: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const value = url.trim();
  if (value.length === 0 || checkHttpsUrl(value) !== "ok") return null;
  if (failed === value) return <p className="help es-photo-broken">{brokenText}</p>;
  return (
    <img
      className="es-photo-thumb"
      src={value}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(value)}
    />
  );
}

/**
 * The Details tab: everything guests read. One explicit Save for the whole page.
 *
 * - Each field is checked on save; problems are shown beside their field and focus moves to
 *   the first one. Nothing typed is ever discarded by a failed save.
 * - A save carries `expectedUpdatedAt`. If the invitation changed somewhere else meanwhile
 *   (`STALE_WRITE`), nothing is overwritten: the host is told and can load the latest version.
 * - Leaving with unsaved changes asks first.
 */
export function ContentEditor({
  eventId,
  memorial,
  canEdit,
  content,
  updatedAt,
  event,
  timeZones,
  design,
  copy,
}: ContentEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const text = copy.content;
  const rootRef = useRef<HTMLDivElement>(null);

  const [original, setOriginal] = useState(content);
  const [baseline, setBaseline] = useState(() => toContentForm(content));
  const [form, setForm] = useState(baseline);
  const [eventBaseline, setEventBaseline] = useState(event);
  const [eventForm, setEventForm] = useState(event);
  const [stamp, setStamp] = useState(updatedAt);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const contentDirty = !sameJson(form, baseline);
  const eventDirty = !sameJson(eventForm, eventBaseline);
  const dirty = contentDirty || eventDirty;
  const locked = !canEdit || pending;

  const clearError = (path: string) => {
    if (errors[path]) {
      setErrors((current) =>
        Object.fromEntries(Object.entries(current).filter(([key]) => key !== path)),
      );
    }
  };
  const set = <K extends keyof ContentForm>(key: K, value: ContentForm[K], path: string = key) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(path);
  };
  const setEvent = <K extends keyof EventForm>(key: K, value: EventForm[K]) => {
    setEventForm((current) => ({ ...current, [key]: value }));
    clearError(`event.${key}`);
  };
  const focusId = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

  const handleFailure = (failure: ActionFailure) => {
    if (failure.code === "STALE_WRITE") {
      setStale(true);
      requestAnimationFrame(() => document.getElementById("content-stale")?.focus());
      return;
    }
    setFormError(failure.message);
    requestAnimationFrame(() => document.getElementById("content-error")?.focus());
  };

  const save = async () => {
    if (!dirty || pending || stale) return;
    const found = {
      ...validateEventForm(eventForm, text.errors),
      ...validateContentForm(form, text.errors),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(text.saveBar.hasErrors);
      requestAnimationFrame(() => {
        rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setFormError(null);
    setPending(true);

    // Content first, with the stamp this page loaded: a newer save elsewhere must be noticed
    // before anything of ours is written.
    if (contentDirty) {
      const next = fromContentForm(form, original);
      const result = await settle(
        () => updateInvitationAction(eventId, { content: next, expectedUpdatedAt: stamp }),
        copy.networkError,
      );
      if (!result) return;
      if (!result.ok) {
        setPending(false);
        return handleFailure(result);
      }
      setOriginal(next);
      setBaseline(form);
      setStamp(result.data.invitationUpdatedAt);
    }

    const eventUpdate = eventUpdateFrom(eventForm, eventBaseline);
    if (eventUpdate) {
      const result = await settle(() => updateEventAction(eventId, eventUpdate), copy.networkError);
      if (!result) return;
      if (!result.ok) {
        setPending(false);
        return handleFailure(result);
      }
      setEventBaseline(eventForm);
      setStamp(result.data.invitationUpdatedAt);
    } else {
      setEventBaseline(eventForm);
    }

    setPending(false);
    toast.show(text.saveBar.savedToast, { tone: "success" });
    router.refresh();
  };

  const discard = () => {
    setForm(baseline);
    setEventForm(eventBaseline);
    setErrors({});
    setFormError(null);
    setDiscarding(false);
  };

  const preview = (
    <InvitationPreview
      themeId={design.themeId}
      templateSlug={design.templateSlug}
      memorial={memorial}
      headline={form.headline}
      subheadline={form.subheadline}
      hosts={form.hosts}
      honoureeName={memorial ? form.honoureeName : undefined}
      wording={form.wording}
      dateLine={formatDateTimeInputs(eventForm.date, eventForm.startTime, copy.dateNames)}
      venueName={form.venueName}
      venueAddress={form.venueAddress}
      coverImageUrl={
        checkHttpsUrl(form.coverImageUrl.trim()) === "ok" ? form.coverImageUrl.trim() : null
      }
      labels={copy.preview}
    />
  );

  const scheduleSorted = form.schedule.every(
    (row, index, rows) => index === 0 || (rows[index - 1]?.time ?? "") <= row.time,
  );

  return (
    <div className="es-editor" ref={rootRef}>
      <UnsavedGuard dirty={dirty && !stale} copy={copy.unsaved} />

      <div className="es-editor-main">
        {stale ? (
          <Notice
            tone="warning"
            role="alert"
            id="content-stale"
            tabIndex={-1}
            title={text.stale.title}
            className="es-gap"
          >
            <p>{text.stale.body}</p>
            <p>
              <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
                {text.stale.reload}
              </Button>
            </p>
          </Notice>
        ) : null}
        {formError ? (
          <Notice tone="danger" role="alert" id="content-error" tabIndex={-1} className="es-gap">
            {formError}
          </Notice>
        ) : null}

        <fieldset className="es-sections" disabled={locked}>
          <legend className="sr-only">{text.title}</legend>

          <EditorSection id="event" title={text.event.title}>
            <TextField
              id="event-title-input"
              label={text.event.eventName}
              hint={text.event.eventNameHint}
              error={errors["event.title"]}
              value={eventForm.title}
              onChange={(e) => setEvent("title", e.target.value)}
              maxLength={CONTENT_LIMITS.eventTitle}
              autoComplete="off"
            />
            <div className="es-when">
              <TextField
                id="event-date"
                type="date"
                label={text.event.date}
                error={errors["event.date"]}
                value={eventForm.date}
                onChange={(e) => setEvent("date", e.target.value)}
              />
              <TextField
                id="event-start"
                type="time"
                label={text.event.startTime}
                error={errors["event.startTime"]}
                value={eventForm.startTime}
                onChange={(e) => setEvent("startTime", e.target.value)}
              />
              <TextField
                id="event-end"
                type="time"
                label={text.event.endTime}
                optional={copy.optional}
                error={errors["event.endTime"]}
                value={eventForm.endTime}
                onChange={(e) => setEvent("endTime", e.target.value)}
              />
            </div>
            <SelectField
              id="event-zone"
              label={text.event.timeZone}
              hint={text.event.timeZoneHint}
              value={eventForm.timeZone}
              onChange={(e) => setEvent("timeZone", e.target.value)}
              fieldClassName="es-field-last"
            >
              {timeZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </SelectField>
          </EditorSection>

          <EditorSection id="wording" title={text.wording.title}>
            <TextField
              id="content-headline"
              label={text.wording.headline}
              hint={text.wording.headlineHint}
              error={errors.headline}
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              maxLength={CONTENT_LIMITS.headline}
              autoComplete="off"
            />
            <TextField
              id="content-subheadline"
              label={text.wording.subheadline}
              optional={copy.optional}
              error={errors.subheadline}
              value={form.subheadline}
              onChange={(e) => set("subheadline", e.target.value)}
              maxLength={CONTENT_LIMITS.subheadline}
              autoComplete="off"
            />
            {memorial ? (
              <TextField
                id="content-honouree"
                label={text.wording.honouree}
                optional={copy.optional}
                error={errors.honoureeName}
                value={form.honoureeName}
                onChange={(e) => set("honoureeName", e.target.value)}
                maxLength={CONTENT_LIMITS.honoureeName}
                autoComplete="off"
              />
            ) : null}
            <TextField
              id="content-hosts"
              label={text.wording.hosts}
              hint={text.wording.hostsHint}
              error={errors.hosts}
              value={form.hosts}
              onChange={(e) => set("hosts", e.target.value)}
              maxLength={CONTENT_LIMITS.hosts}
              autoComplete="off"
            />
            <TextAreaField
              id="content-wording"
              label={text.wording.wording}
              optional={copy.optional}
              hint={text.wording.wordingHint}
              error={errors.wording}
              value={form.wording}
              onChange={(e) => set("wording", e.target.value)}
              placeholder={
                memorial ? text.wording.wordingPlaceholderMemorial : text.wording.wordingPlaceholder
              }
              maxLength={CONTENT_LIMITS.wording}
              rows={5}
              fieldClassName="es-field-last"
            />
          </EditorSection>

          <EditorSection
            id="story"
            title={memorial ? text.story.titleMemorial : text.story.title}
            lead={text.story.lead}
          >
            {form.story.length === 0 ? <p className="es-empty-line">{text.story.empty}</p> : null}
            <ol className="es-rows">
              {form.story.map((row, index) => {
                const label = fill(text.story.paragraph, { number: index + 1 });
                return (
                  <li key={row.key} className="es-row es-row-plain">
                    <TextAreaField
                      id={`story-${row.key}`}
                      label={label}
                      error={errors[`story.${row.key}`]}
                      value={row.value}
                      onChange={(e) =>
                        set(
                          "story",
                          form.story.map((item) =>
                            item.key === row.key ? { ...item, value: e.target.value } : item,
                          ),
                          `story.${row.key}`,
                        )
                      }
                      maxLength={CONTENT_LIMITS.storyParagraph}
                      rows={4}
                      fieldClassName="es-row-grow es-field-last"
                    />
                    <RowTools
                      label={label}
                      index={index}
                      count={form.story.length}
                      onMove={(delta) => set("story", moveItem(form.story, index, delta))}
                      onRemove={() => {
                        set(
                          "story",
                          form.story.filter((item) => item.key !== row.key),
                        );
                        focusId("story-add");
                      }}
                      copy={text.list}
                      disabled={locked}
                    />
                  </li>
                );
              })}
            </ol>
            <Button
              id="story-add"
              variant="secondary"
              size="small"
              disabled={form.story.length >= CONTENT_LIMITS.storyItems}
              onClick={() => {
                const key = newRowId("story-");
                set("story", [...form.story, { key, value: "" }]);
                focusId(`story-${key}`);
              }}
            >
              <Plus className="icon" aria-hidden="true" />
              {text.story.add}
            </Button>
            {form.story.length >= CONTENT_LIMITS.storyItems ? (
              <p className="help">{fill(text.list.limit, { max: CONTENT_LIMITS.storyItems })}</p>
            ) : null}
          </EditorSection>

          <EditorSection id="schedule" title={text.schedule.title} lead={text.schedule.lead}>
            {form.schedule.length === 0 ? (
              <p className="es-empty-line">{text.schedule.empty}</p>
            ) : null}
            <ol className="es-rows">
              {form.schedule.map((row, index) => {
                const label = fill(text.schedule.item, { number: index + 1 });
                const update = (patch: Partial<typeof row>, field: string) =>
                  set(
                    "schedule",
                    form.schedule.map((item) =>
                      item.id === row.id ? { ...item, ...patch } : item,
                    ),
                    `schedule.${row.id}.${field}`,
                  );
                return (
                  <li key={row.id}>
                    <fieldset className="es-row">
                      <legend>{label}</legend>
                      <div className="es-row-grow">
                        <div className="es-schedule-top">
                          <TextField
                            id={`schedule-${row.id}-time`}
                            type="time"
                            label={text.schedule.time}
                            error={errors[`schedule.${row.id}.time`]}
                            value={row.time}
                            onChange={(e) => update({ time: e.target.value }, "time")}
                          />
                          <TextField
                            id={`schedule-${row.id}-title`}
                            label={text.schedule.itemTitle}
                            error={errors[`schedule.${row.id}.title`]}
                            value={row.title}
                            onChange={(e) => update({ title: e.target.value }, "title")}
                            placeholder={
                              index === 0 ? text.schedule.itemTitlePlaceholder : undefined
                            }
                            maxLength={CONTENT_LIMITS.scheduleTitle}
                            autoComplete="off"
                          />
                        </div>
                        <div className="fields">
                          <TextField
                            id={`schedule-${row.id}-location`}
                            label={text.schedule.location}
                            optional={copy.optional}
                            error={errors[`schedule.${row.id}.location`]}
                            value={row.location}
                            onChange={(e) => update({ location: e.target.value }, "location")}
                            maxLength={CONTENT_LIMITS.scheduleLocation}
                            autoComplete="off"
                            fieldClassName="es-field-last"
                          />
                          <TextField
                            id={`schedule-${row.id}-description`}
                            label={text.schedule.description}
                            optional={copy.optional}
                            error={errors[`schedule.${row.id}.description`]}
                            value={row.description}
                            onChange={(e) => update({ description: e.target.value }, "description")}
                            maxLength={CONTENT_LIMITS.scheduleDescription}
                            autoComplete="off"
                            fieldClassName="es-field-last"
                          />
                        </div>
                      </div>
                      <RowTools
                        label={label}
                        index={index}
                        count={form.schedule.length}
                        onMove={(delta) => set("schedule", moveItem(form.schedule, index, delta))}
                        onRemove={() => {
                          set(
                            "schedule",
                            form.schedule.filter((item) => item.id !== row.id),
                          );
                          focusId("schedule-add");
                        }}
                        copy={text.list}
                        disabled={locked}
                      />
                    </fieldset>
                  </li>
                );
              })}
            </ol>
            <div className="cluster">
              <Button
                id="schedule-add"
                variant="secondary"
                size="small"
                disabled={form.schedule.length >= CONTENT_LIMITS.scheduleItems}
                onClick={() => {
                  const id = newRowId("s");
                  set("schedule", [
                    ...form.schedule,
                    { id, time: "", title: "", description: "", location: "" },
                  ]);
                  focusId(`schedule-${id}-time`);
                }}
              >
                <Plus className="icon" aria-hidden="true" />
                {text.schedule.add}
              </Button>
              {form.schedule.length > 1 && !scheduleSorted ? (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() =>
                    set(
                      "schedule",
                      [...form.schedule].sort((a, b) => a.time.localeCompare(b.time)),
                    )
                  }
                >
                  {text.schedule.sort}
                </Button>
              ) : null}
            </div>
            {form.schedule.length >= CONTENT_LIMITS.scheduleItems ? (
              <p className="help">{fill(text.list.limit, { max: CONTENT_LIMITS.scheduleItems })}</p>
            ) : null}
          </EditorSection>

          <EditorSection id="venue" title={text.venue.title} lead={text.venue.lead}>
            <TextField
              id="content-venue-name"
              label={text.venue.name}
              error={errors.venueName}
              value={form.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              maxLength={CONTENT_LIMITS.venueName}
              autoComplete="off"
            />
            <TextField
              id="content-venue-address"
              label={text.venue.address}
              optional={copy.optional}
              error={errors.venueAddress}
              value={form.venueAddress}
              onChange={(e) => set("venueAddress", e.target.value)}
              maxLength={CONTENT_LIMITS.venueAddress}
              autoComplete="off"
            />
            <TextField
              id="content-venue-maps"
              type="url"
              inputMode="url"
              label={text.venue.mapsUrl}
              optional={copy.optional}
              hint={text.venue.mapsUrlHint}
              error={errors.venueMapsUrl}
              value={form.venueMapsUrl}
              onChange={(e) => set("venueMapsUrl", e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <TextAreaField
              id="content-venue-parking"
              label={text.venue.parking}
              optional={copy.optional}
              error={errors.venueParking}
              value={form.venueParking}
              onChange={(e) => set("venueParking", e.target.value)}
              maxLength={CONTENT_LIMITS.venueParking}
              rows={3}
              className="es-textarea-short"
              fieldClassName="es-field-last"
            />
          </EditorSection>

          <EditorSection id="dress-code" title={text.extras.title}>
            <TextField
              id="content-dress-code"
              label={text.extras.dressCode}
              optional={copy.optional}
              error={errors.dressCode}
              value={form.dressCode}
              onChange={(e) => set("dressCode", e.target.value)}
              placeholder={
                memorial
                  ? text.extras.dressCodePlaceholderMemorial
                  : text.extras.dressCodePlaceholder
              }
              maxLength={CONTENT_LIMITS.dressCode}
              autoComplete="off"
              fieldClassName="es-field-last"
            />
          </EditorSection>

          <EditorSection id="faq" title={text.faq.title} lead={text.faq.lead}>
            {form.faq.length === 0 ? <p className="es-empty-line">{text.faq.empty}</p> : null}
            <ol className="es-rows">
              {form.faq.map((row, index) => {
                const label = fill(text.faq.item, { number: index + 1 });
                const update = (patch: Partial<typeof row>, field: string) =>
                  set(
                    "faq",
                    form.faq.map((item) => (item.key === row.key ? { ...item, ...patch } : item)),
                    `faq.${row.key}.${field}`,
                  );
                return (
                  <li key={row.key}>
                    <fieldset className="es-row">
                      <legend>{label}</legend>
                      <div className="es-row-grow">
                        <TextField
                          id={`faq-${row.key}-question`}
                          label={text.faq.question}
                          error={errors[`faq.${row.key}.question`]}
                          value={row.question}
                          onChange={(e) => update({ question: e.target.value }, "question")}
                          maxLength={CONTENT_LIMITS.faqQuestion}
                          autoComplete="off"
                        />
                        <TextAreaField
                          id={`faq-${row.key}-answer`}
                          label={text.faq.answer}
                          error={errors[`faq.${row.key}.answer`]}
                          value={row.answer}
                          onChange={(e) => update({ answer: e.target.value }, "answer")}
                          maxLength={CONTENT_LIMITS.faqAnswer}
                          rows={3}
                          className="es-textarea-short"
                          fieldClassName="es-field-last"
                        />
                      </div>
                      <RowTools
                        label={label}
                        index={index}
                        count={form.faq.length}
                        onMove={(delta) => set("faq", moveItem(form.faq, index, delta))}
                        onRemove={() => {
                          set(
                            "faq",
                            form.faq.filter((item) => item.key !== row.key),
                          );
                          focusId("faq-add");
                        }}
                        copy={text.list}
                        disabled={locked}
                      />
                    </fieldset>
                  </li>
                );
              })}
            </ol>
            <Button
              id="faq-add"
              variant="secondary"
              size="small"
              disabled={form.faq.length >= CONTENT_LIMITS.faqItems}
              onClick={() => {
                const key = newRowId("faq-");
                set("faq", [...form.faq, { key, question: "", answer: "" }]);
                focusId(`faq-${key}-question`);
              }}
            >
              <Plus className="icon" aria-hidden="true" />
              {text.faq.add}
            </Button>
            {form.faq.length >= CONTENT_LIMITS.faqItems ? (
              <p className="help">{fill(text.list.limit, { max: CONTENT_LIMITS.faqItems })}</p>
            ) : null}
          </EditorSection>

          <EditorSection id="photos" title={text.images.title}>
            <Notice className="es-gap">{text.images.note}</Notice>
            <div className="es-photo-field">
              <TextField
                id="content-cover"
                type="url"
                inputMode="url"
                label={text.images.cover}
                optional={copy.optional}
                hint={text.images.coverHint}
                error={errors.coverImageUrl}
                value={form.coverImageUrl}
                onChange={(e) => set("coverImageUrl", e.target.value)}
                placeholder="https://"
                autoComplete="off"
                spellCheck={false}
                fieldClassName="es-row-grow"
              />
              <PhotoThumb
                url={form.coverImageUrl}
                alt={text.images.thumbAlt}
                brokenText={text.images.broken}
              />
            </div>
            <p className="label es-list-label">{text.images.gallery}</p>
            {form.gallery.length === 0 ? (
              <p className="es-empty-line">{text.images.empty}</p>
            ) : null}
            <ol className="es-rows">
              {form.gallery.map((row, index) => {
                const label = fill(text.images.galleryItem, { number: index + 1 });
                return (
                  <li key={row.key} className="es-row es-row-plain">
                    <div className="es-photo-field es-row-grow">
                      <TextField
                        id={`gallery-${row.key}`}
                        type="url"
                        inputMode="url"
                        label={label}
                        error={errors[`gallery.${row.key}`]}
                        value={row.value}
                        onChange={(e) =>
                          set(
                            "gallery",
                            form.gallery.map((item) =>
                              item.key === row.key ? { ...item, value: e.target.value } : item,
                            ),
                            `gallery.${row.key}`,
                          )
                        }
                        placeholder="https://"
                        autoComplete="off"
                        spellCheck={false}
                        fieldClassName="es-row-grow es-field-last"
                      />
                      <PhotoThumb
                        url={row.value}
                        alt={text.images.thumbAlt}
                        brokenText={text.images.broken}
                      />
                    </div>
                    <RowTools
                      label={label}
                      index={index}
                      count={form.gallery.length}
                      onMove={(delta) => set("gallery", moveItem(form.gallery, index, delta))}
                      onRemove={() => {
                        set(
                          "gallery",
                          form.gallery.filter((item) => item.key !== row.key),
                        );
                        focusId("gallery-add");
                      }}
                      copy={text.list}
                      disabled={locked}
                    />
                  </li>
                );
              })}
            </ol>
            <Button
              id="gallery-add"
              variant="secondary"
              size="small"
              disabled={form.gallery.length >= CONTENT_LIMITS.galleryItems}
              onClick={() => {
                const key = newRowId("gallery-");
                set("gallery", [...form.gallery, { key, value: "" }]);
                focusId(`gallery-${key}`);
              }}
            >
              <Plus className="icon" aria-hidden="true" />
              {text.images.add}
            </Button>
            {form.gallery.length >= CONTENT_LIMITS.galleryItems ? (
              <p className="help">{fill(text.list.limit, { max: CONTENT_LIMITS.galleryItems })}</p>
            ) : null}
          </EditorSection>
        </fieldset>
      </div>

      <aside className="es-editor-aside es-aside-wide-only" aria-label={copy.preview.title}>
        <p className="es-aside-title">{copy.preview.title}</p>
        {preview}
        <p className="notice">{copy.preview.note}</p>
      </aside>

      {canEdit ? (
        <SaveBar
          dirty={dirty}
          pending={pending}
          saveDisabled={stale}
          onSave={save}
          onDiscard={() => setDiscarding(true)}
          labels={text.saveBar}
        >
          <Button
            variant="ghost"
            className="es-narrow-only"
            onClick={() => setPreviewOpen(true)}
            disabled={pending}
          >
            <Eye className="icon" aria-hidden="true" />
            {text.saveBar.preview}
          </Button>
        </SaveBar>
      ) : null}

      <Drawer open={previewOpen} onClose={() => setPreviewOpen(false)} title={copy.preview.title}>
        {preview}
        <p className="notice es-gap-top">{copy.preview.note}</p>
      </Drawer>

      <ConfirmDialog
        open={discarding}
        title={text.discard.title}
        confirmLabel={text.discard.confirm}
        tone="danger"
        onConfirm={discard}
        onCancel={() => setDiscarding(false)}
      >
        {text.discard.body}
      </ConfirmDialog>
    </div>
  );
}
