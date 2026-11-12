"use client";

import { Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useId, useState } from "react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { buttonClass, CopyButton, Modal, Notice, Spinner, useUiCopy } from "@/components/ui";
import { fill } from "@/lib/guest-list/fill";
import { fileSlug } from "@/lib/guest-list/view";

export interface QrDialogProps {
  /** The household whose link to show as a QR code, or null when closed. */
  party: { id: string; displayName: string; inviteUrl: string | null } | null;
  onClose: () => void;
  copy: InvitationStudioGuestsCopy["share"]["qr"];
  copyLinkLabel: string;
  copiedLabel: string;
}

/**
 * A QR code for one household's private link, drawn in the browser (the link never leaves the
 * page) and downloadable as a PNG for a printed card or a message.
 */
export function QrDialog(props: QrDialogProps) {
  return <QrModal key={props.party?.id ?? "closed"} {...props} />;
}

function QrModal({ party, onClose, copy, copyLinkLabel, copiedLabel }: QrDialogProps) {
  const { ui } = useUiCopy();
  const linkId = useId();
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const url = party?.inviteUrl ?? null;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Black on white with a quiet zone: the combination every phone camera reads reliably.
    QRCode.toDataURL(url, { width: 720, margin: 3, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!cancelled) setImage(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const name = party?.displayName ?? "";

  return (
    <Modal
      open={party !== null}
      onClose={onClose}
      title={fill(copy.title, { name })}
      description={copy.lead}
    >
      {party && url ? (
        <div className="sb-qr">
          {failed ? (
            <Notice tone="danger" role="alert">
              {copy.failed}
            </Notice>
          ) : image ? (
            // A data: URL drawn in the browser, so a plain <img> (nothing for an optimiser to do).
            <img
              className="sb-qr-image"
              src={image}
              width={288}
              height={288}
              alt={fill(copy.alt, { name })}
            />
          ) : (
            <div className="sb-qr-image sb-qr-loading">
              <Spinner large label={ui.loading} />
            </div>
          )}
          {/* The link as text: it can always be selected and copied by hand. */}
          <div className="field sb-qr-link">
            <label className="label" htmlFor={linkId}>
              {copy.linkLabel}
            </label>
            <input
              id={linkId}
              type="text"
              readOnly
              dir="ltr"
              spellCheck={false}
              autoComplete="off"
              value={url}
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <div className="dialog-footer">
            <CopyButton
              value={url}
              label={copyLinkLabel}
              copiedLabel={copiedLabel}
              size="default"
            />
            {image ? (
              <a
                className={buttonClass()}
                href={image}
                download={`${copy.filename}-${fileSlug(name)}.png`}
              >
                <Download className="icon" aria-hidden="true" />
                {copy.download}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
