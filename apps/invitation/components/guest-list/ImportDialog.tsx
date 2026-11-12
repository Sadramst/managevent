"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { type ChangeEvent, useId, useState, useTransition } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { GuestImportResult } from "@managevent/validators";
import { importCsvAction } from "@/app/studio/[eventId]/guests/actions";
import {
  Button,
  buttonClass,
  Field,
  fieldControlProps,
  Modal,
  Notice,
  useSettle,
  useToast,
  useUiCopy,
} from "@/components/ui";
import { MAX_CSV_LENGTH } from "@/lib/guest-list/csv-template";
import { fill, fillCount } from "@/lib/guest-list/fill";
import { newUuid } from "@/lib/guest-list/uuid";
import { PlanLimitNotice, type PremiumInfo, readLimitDetails } from "./PlanLimitNotice";
import { PremiumPointer } from "./PremiumPointer";

type ImportCopy = InvitationStudioGuestsCopy["importCsv"];

export interface ImportDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  copy: ImportCopy;
  common: InvitationStudioGuestsCopy["common"];
  limitCopy: InvitationStudioGuestsCopy["guests"]["limit"];
  premium: PremiumInfo | null;
  /** `data:` URL of the CSV template, built on the server. */
  templateHref: string;
}

const MAX_ERRORS_SHOWN = 12;
const MAX_PREVIEW_ROWS = 25;

/**
 * CSV import in two steps: choose a file (or paste rows), then check a dry-run preview with
 * row problems and the plan limit before anything is added. The commit carries an idempotency
 * key, so a retry cannot add the list twice.
 */
export function ImportDialog(props: ImportDialogProps) {
  return <ImportFlow key={props.open ? "open" : "closed"} {...props} />;
}

function ImportFlow({
  eventId,
  open,
  onClose,
  copy,
  common,
  limitCopy,
  premium,
  templateHref,
}: ImportDialogProps) {
  const { ui } = useUiCopy();
  const toast = useToast();
  const run = useSettle();
  const fileId = useId();
  const pasteId = useId();
  const [pending, startTransition] = useTransition();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GuestImportResult | null>(null);
  const [commitKey, setCommitKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    message: string;
    limit: { limit: number; used: number } | null;
  } | null>(null);

  const source = csv.length > 0 ? csv : pasted;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    setCsv("");
    setFileName(null);
    if (!file) return;
    if (file.size > MAX_CSV_LENGTH) {
      setFileError(copy.fileTooLarge);
      event.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      if (text.length > MAX_CSV_LENGTH) {
        setFileError(copy.fileTooLarge);
        return;
      }
      setCsv(text);
      setFileName(file.name);
    } catch {
      setFileError(copy.fileUnreadable);
    }
  };

  const check = () => {
    setFailure(null);
    if (source.trim().length === 0) {
      setFileError(copy.empty);
      return;
    }
    if (source.length > MAX_CSV_LENGTH) {
      setFileError(copy.fileTooLarge);
      return;
    }
    startTransition(async () => {
      const result = await run(() => importCsvAction(eventId, source, true));
      if (!result) return;
      if (result.ok) {
        setPreview(result.data);
        // A new key per checked file: the same file committed twice by mistake adds it once.
        setCommitKey(newUuid());
      } else {
        setFailure({ message: result.message, limit: null });
      }
    });
  };

  const commit = () => {
    if (!preview || !commitKey) return;
    setFailure(null);
    startTransition(async () => {
      // The checked preview and its key survive a dropped connection, so "Add" can be pressed
      // again and the file is still added only once.
      const result = await run(() => importCsvAction(eventId, source, false, commitKey));
      if (!result) return;
      if (result.ok) {
        toast.show(
          fill(copy.done, {
            parties: result.data.summary.partyCount,
            guests: result.data.summary.guestCount,
          }),
          { tone: "success" },
        );
        onClose();
        return;
      }
      setFailure({
        message: result.message,
        limit: result.code === "PLAN_LIMIT_EXCEEDED" ? readLimitDetails(result.details) : null,
      });
    });
  };

  const tooManyRows = preview?.errors.some((error) => error.code === "TOO_MANY_ROWS") ?? false;
  const nothingToAdd = preview !== null && preview.summary.guestCount === 0;
  const blocked = preview !== null && (preview.plan.exceeds || tooManyRows || nothingToAdd);

  const failureNotice = failure ? (
    failure.limit ? (
      <PlanLimitNotice
        limit={failure.limit.limit}
        used={failure.limit.used}
        copy={limitCopy}
        premiumCopy={common.premium}
        premium={premium}
      />
    ) : (
      <Notice tone="danger" role="alert">
        {failure.message}
      </Notice>
    )
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={preview ? undefined : copy.lead}
      dismissible={!pending}
      className="sb-dialog-wide"
    >
      {preview === null ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            check();
          }}
        >
          <h3 className="sb-heading">{copy.stepFile}</h3>
          <Field id={fileId} label={copy.file} hint={copy.fileHint} error={fileError}>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sb-file-input"
              onChange={onFile}
              {...fieldControlProps(fileId, { hint: copy.fileHint, error: fileError })}
            />
          </Field>
          {fileName ? (
            <p className="sb-import-file">
              <FileSpreadsheet className="icon" aria-hidden="true" />
              <bdi>{fileName}</bdi>
            </p>
          ) : (
            <details className="sb-import-paste">
              <summary>{copy.orPaste}</summary>
              <Field id={pasteId} label={copy.paste} hint={copy.pasteHint}>
                <textarea
                  rows={6}
                  spellCheck={false}
                  value={pasted}
                  onChange={(event) => {
                    setPasted(event.target.value);
                    setFileError(null);
                  }}
                  {...fieldControlProps(pasteId, { hint: copy.pasteHint })}
                />
              </Field>
            </details>
          )}

          <div className="sb-import-help">
            <p className="sb-import-help-title">{copy.columnsTitle}</p>
            <dl className="sb-import-columns">
              {copy.columns.map((column) => (
                <div key={column.name}>
                  <dt>
                    <code>{column.name}</code>
                  </dt>
                  <dd>{column.note}</dd>
                </div>
              ))}
            </dl>
            <a
              className={buttonClass({ variant: "ghost", size: "small" })}
              href={templateHref}
              download={copy.templateFilename}
            >
              <Download className="icon" aria-hidden="true" />
              {copy.template}
            </a>
          </div>

          {failureNotice}
          <div className="dialog-footer">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              {ui.cancel}
            </Button>
            <Button type="submit" pending={pending} pendingLabel={copy.checking}>
              {copy.check}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <h3 className="sb-heading">{copy.stepPreview}</h3>
          <Notice tone={nothingToAdd ? "warning" : "info"} role="status">
            <p>
              {nothingToAdd
                ? copy.summaryNone
                : fill(copy.summary, {
                    parties: preview.summary.partyCount,
                    guests: preview.summary.guestCount,
                  })}
              {preview.summary.skippedRows > 0
                ? ` ${fillCount(preview.summary.skippedRows, copy.skippedOne, copy.skipped)}`
                : null}
            </p>
          </Notice>

          {preview.plan.exceeds && preview.plan.limit !== null ? (
            <Notice tone="warning" role="alert" title={copy.limitTitle}>
              <p>
                {fill(copy.limit, {
                  current: preview.plan.current,
                  after: preview.plan.afterImport,
                  limit: preview.plan.limit,
                })}
              </p>
              {premium ? <PremiumPointer {...premium} copy={common.premium} /> : null}
            </Notice>
          ) : null}

          {preview.errors.length > 0 ? (
            <div className="sb-import-errors">
              <h4 className="sb-import-help-title">{copy.errorsTitle}</h4>
              <ul>
                {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((error, index) => (
                  <li key={`${error.row}-${error.code}-${index}`}>
                    <strong className="num">{fill(copy.errorRow, { row: error.row })}</strong>{" "}
                    {copy.errors[error.code]}
                  </li>
                ))}
              </ul>
              {preview.errors.length > MAX_ERRORS_SHOWN ? (
                <p className="notice">
                  {fill(copy.moreErrors, { count: preview.errors.length - MAX_ERRORS_SHOWN })}
                </p>
              ) : null}
            </div>
          ) : null}

          {preview.parties.length > 0 ? (
            <>
              <div className="table-wrap sb-import-preview sb-stack-wrap" tabIndex={0}>
                <table className="table table-compact sb-stack-table">
                  <caption>{copy.previewCaption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{copy.previewHousehold}</th>
                      <th scope="col">{copy.previewGuests}</th>
                      <th scope="col" className="cell-num">
                        {copy.previewSeats}
                      </th>
                      <th scope="col">{copy.previewTable}</th>
                      <th scope="col">{copy.previewTags}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.parties.slice(0, MAX_PREVIEW_ROWS).map((party, index) => (
                      <tr key={`${party.displayName}-${index}`}>
                        <th scope="row">{party.displayName}</th>
                        <td data-label={copy.previewGuests}>
                          {party.guests.map((guest, guestIndex) => (
                            <span key={`${guest.name}-${guestIndex}`} className="sb-import-guest">
                              {guest.name}
                              {guest.isChild ? <span className="pill">{common.child}</span> : null}
                            </span>
                          ))}
                        </td>
                        <td className="cell-num" data-label={copy.previewSeats}>
                          {party.maxSeats}
                        </td>
                        <td
                          data-label={copy.previewTable}
                          data-empty={party.tableLabel ? undefined : ""}
                        >
                          {party.tableLabel ?? ""}
                        </td>
                        <td
                          data-label={copy.previewTags}
                          data-empty={party.tags.length > 0 ? undefined : ""}
                        >
                          {party.tags.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.parties.length > MAX_PREVIEW_ROWS ? (
                <p className="notice">
                  {fill(copy.previewMore, { count: preview.parties.length - MAX_PREVIEW_ROWS })}
                </p>
              ) : null}
            </>
          ) : null}

          {failureNotice}
          <div className="dialog-footer">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setPreview(null);
                setFailure(null);
              }}
            >
              {copy.back}
            </Button>
            <Button
              onClick={commit}
              disabled={blocked}
              pending={pending}
              pendingLabel={copy.committing}
            >
              {fill(copy.commit, { guests: preview.summary.guestCount })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
