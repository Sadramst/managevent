"use client";

import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InvitationStudioCopy } from "@managevent/i18n";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { ActionFailure } from "@/lib/action-result";
import { settle } from "@/lib/client-action";
import { confirmCheckoutAction } from "@/lib/event-studio/actions";
import { fill } from "@/lib/event-studio/local-date";
import { routes } from "@/lib/urls";

export interface SimulatedCheckoutProps {
  eventId: string;
  eventTitle: string;
  sessionId: string;
  householdCount: number;
  passLabel: string;
  price: string;
  gst: string;
  copy: InvitationStudioCopy["settings"]["simulatedCheckout"];
  networkError: string;
}

/**
 * Interactive simulated checkout screen for local development and E2E testing when live Stripe
 * credentials are not configured. Calls the real `confirmCheckoutAction` (`POST /plan/checkout/confirm`)
 * which runs `applyCheckoutUpgrade` to record the `Payment` and `AuditLog` in PostgreSQL and
 * upgrade `Invitation.plan` to `PREMIUM`.
 */
export function SimulatedCheckout({
  eventId,
  eventTitle,
  sessionId,
  householdCount,
  passLabel,
  price,
  gst,
  copy,
  networkError,
}: SimulatedCheckoutProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  const onCompletePayment = async () => {
    if (pending) return;
    setPending(true);
    setFailure(null);
    const result = await settle(() => confirmCheckoutAction(eventId, sessionId), networkError);
    if (!result) {
      setPending(false);
      return;
    }
    if (result.ok) {
      router.push(`${routes.eventTab(eventId, "share")}?upgraded=1`);
      router.refresh();
      return;
    }
    setPending(false);
    setFailure(result);
  };

  return (
    <div className="stack es-sections">
      <section className="card es-section" aria-labelledby="sim-checkout-summary-title">
        <div className="es-section-head">
          <div className="cluster">
            <h2 id="sim-checkout-summary-title" className="es-section-title">
              {copy.summaryTitle}
            </h2>
            <Badge>{copy.testModeBadge}</Badge>
          </div>
          <p className="muted">{copy.testModeNote}</p>
        </div>

        <dl className="dl es-dl es-plan-dl">
          <div>
            <dt>{copy.eventLabel}</dt>
            <dd>{eventTitle}</dd>
          </div>
          <div>
            <dt>{copy.passLabel}</dt>
            <dd>{passLabel}</dd>
          </div>
          <div>
            <dt>{copy.linksLabel}</dt>
            <dd>
              {householdCount > 0
                ? fill(copy.linksValue, { count: householdCount })
                : copy.linksValueEmpty}
            </dd>
          </div>
          <div>
            <dt>{copy.priceLabel}</dt>
            <dd className="num">
              <strong>{price}</strong> ({copy.gstLabel}: {gst})
            </dd>
          </div>
          <div>
            <dt>{copy.cardLegend}</dt>
            <dd className="es-inline">
              <CreditCard className="icon" aria-hidden="true" /> {copy.cardMethod}
            </dd>
          </div>
        </dl>

        {failure ? (
          <Notice tone="danger" role="alert" className="es-gap-top">
            <p>{failure.message}</p>
          </Notice>
        ) : null}

        <div className="cluster es-gap-top">
          <Button
            type="button"
            pending={pending}
            pendingLabel={copy.paying}
            onClick={() => void onCompletePayment()}
          >
            <Lock className="icon" aria-hidden="true" />
            {fill(copy.payButton, { price })}
          </Button>
          <Link
            className={buttonClass({ variant: "secondary" })}
            href={`${routes.eventTab(eventId, "settings")}?checkout=cancelled`}
          >
            {copy.cancelButton}
          </Link>
        </div>

        <p className="muted es-gap-top es-inline">
          <ShieldCheck className="icon" aria-hidden="true" />
          <span>Session ID: {sessionId}</span>
        </p>
      </section>
    </div>
  );
}
