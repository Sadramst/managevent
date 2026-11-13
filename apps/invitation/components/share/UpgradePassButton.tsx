"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { settle } from "@/lib/client-action";
import { startCheckoutAction } from "@/lib/event-studio/actions";
import { rowKey } from "@/lib/event-studio/wizard";

export interface UpgradePassButtonProps {
  eventId: string;
  label: string;
  workingLabel: string;
  networkError: string;
  variant?: "primary" | "secondary";
  size?: "default" | "small";
}

/**
 * Starts checkout for the Premium Event Pass ($69 AUD incl. GST) directly from the Share or
 * Guests tab and redirects to the checkout session URL.
 */
export function UpgradePassButton({
  eventId,
  label,
  workingLabel,
  networkError,
  variant = "primary",
  size = "default",
}: UpgradePassButtonProps) {
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const checkoutKey = useRef<string | null>(null);

  const onUpgrade = async () => {
    if (starting) return;
    setStarting(true);
    checkoutKey.current ??= rowKey();
    const key = checkoutKey.current;
    const result = await settle(() => startCheckoutAction(eventId, key), networkError);
    if (!result) {
      setStarting(false);
      return;
    }
    if (result.ok) {
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setStarting(false);
    toast.show(result.message, { tone: "danger" });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      pending={starting}
      pendingLabel={workingLabel}
      onClick={() => void onUpgrade()}
    >
      {label}
    </Button>
  );
}
