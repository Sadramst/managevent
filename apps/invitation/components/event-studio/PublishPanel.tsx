"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InvitationStudioCopy } from "@managevent/i18n";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { publishAction, unpublishAction } from "@/lib/event-studio/actions";
import { settle } from "@/lib/client-action";

type PublishCopy = InvitationStudioCopy["overview"]["publish"];
type Requirement = keyof PublishCopy["missing"];

export interface PublishPanelProps {
  eventId: string;
  published: boolean;
  /** False for a view-only co-host: the state is shown, the buttons are not. */
  canEdit: boolean;
  /** Where each missing requirement is fixed (a field on the Details tab). */
  fixLinks: Record<Requirement, string>;
  shareHref: string;
  copy: PublishCopy;
  /** Shown when the request never reached the server. */
  networkError: string;
}

function isRequirement(value: unknown, copy: PublishCopy): value is Requirement {
  return typeof value === "string" && Object.hasOwn(copy.missing, value);
}

/** `details.missing` of a `422 PUBLISH_REQUIREMENTS_NOT_MET` answer, known codes only. */
function readMissing(details: unknown, copy: PublishCopy): Requirement[] {
  if (typeof details !== "object" || details === null) return [];
  const missing = (details as { missing?: unknown }).missing;
  if (!Array.isArray(missing)) return [];
  return missing.filter((item): item is Requirement => isRequirement(item, copy));
}

/**
 * The publish state of an invitation and the one button that changes it.
 *
 * Publishing can be refused (422) when the headline, hosts, venue name or a future date is
 * missing: each missing item is listed with a link straight to its field. Unpublishing asks
 * first, because guests' links stop opening until the invitation is published again.
 */
export function PublishPanel({
  eventId,
  published,
  canEdit,
  fixLinks,
  shareHref,
  copy,
  networkError,
}: PublishPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<"publish" | "unpublish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Requirement[]>([]);
  const [confirming, setConfirming] = useState(false);

  const publish = async () => {
    setPending("publish");
    setError(null);
    setMissing([]);
    const result = await settle(() => publishAction(eventId), networkError);
    setPending(null);
    if (!result) return;
    if (result.ok) {
      toast.show(copy.published, { tone: "success" });
      router.refresh();
      return;
    }
    const items =
      result.code === "PUBLISH_REQUIREMENTS_NOT_MET" ? readMissing(result.details, copy) : [];
    if (items.length > 0) setMissing(items);
    else setError(result.message);
  };

  const unpublish = async () => {
    setPending("unpublish");
    setError(null);
    const result = await settle(() => unpublishAction(eventId), networkError);
    setPending(null);
    setConfirming(false);
    if (!result) return;
    if (result.ok) {
      toast.show(copy.unpublished);
      router.refresh();
    } else {
      setError(result.message);
    }
  };

  return (
    <section
      id="publish"
      className="card es-publish"
      data-state={published ? "live" : "draft"}
      aria-labelledby="publish-title"
    >
      <div className="es-publish-row">
        <span className="es-publish-icon" aria-hidden="true">
          {published ? <CircleCheck /> : <CircleDashed />}
        </span>
        <div className="es-publish-text">
          <h2 id="publish-title" className="es-publish-title">
            {published ? copy.liveTitle : copy.draftTitle}
          </h2>
          <p className="muted">{published ? copy.liveBody : copy.draftBody}</p>
        </div>
        {canEdit ? (
          <div className="es-publish-actions">
            {published ? (
              <>
                <Link className={buttonClass()} href={shareHref}>
                  {copy.share}
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(true)}
                  disabled={pending !== null}
                >
                  {copy.unpublish}
                </Button>
              </>
            ) : (
              <Button
                onClick={publish}
                pending={pending === "publish"}
                pendingLabel={copy.publishing}
              >
                {copy.publish}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {missing.length > 0 ? (
        <Notice tone="warning" role="alert" title={copy.missingTitle} className="es-publish-notice">
          <ul className="es-missing">
            {missing.map((item) => (
              <li key={item}>
                <span>{copy.missing[item]}</span>
                <Link className="link" href={fixLinks[item]}>
                  {copy.fix}
                </Link>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="danger" role="alert" className="es-publish-notice">
          {error}
        </Notice>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={copy.unpublishTitle}
        confirmLabel={copy.unpublish}
        pending={pending === "unpublish"}
        pendingLabel={copy.unpublishing}
        onConfirm={unpublish}
        onCancel={() => setConfirming(false)}
      >
        {copy.unpublishBody}
      </ConfirmDialog>
    </section>
  );
}
