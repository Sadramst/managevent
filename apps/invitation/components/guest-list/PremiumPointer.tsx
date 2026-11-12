import Link from "next/link";

/** Serialisable twin of `PremiumPointerInfo` in `lib/guest-list/event` (which is server-only). */
export interface PremiumPointerProps {
  stripeCheckout: boolean;
  settingsHref: string;
  contactHref: string;
  copy: { seePremium: string; checkoutOff: string; contactUs: string };
}

/**
 * The honest next step when something needs the Premium Event Pass. With card payments on, a
 * link to the event's Settings tab (where the upgrade is). With them off, it says so and offers
 * "Contact us" on www instead of an upgrade button that could not finish.
 *
 * Never render this for a memorial event: callers pass `premium: null` there.
 */
export function PremiumPointer({
  stripeCheckout,
  settingsHref,
  contactHref,
  copy,
}: PremiumPointerProps) {
  if (stripeCheckout) {
    return (
      <p className="sb-premium">
        <Link className="link" href={settingsHref}>
          {copy.seePremium}
        </Link>
      </p>
    );
  }
  return (
    <p className="sb-premium">
      {copy.checkoutOff}{" "}
      <a className="link" href={contactHref} rel="noopener">
        {copy.contactUs}
      </a>
    </p>
  );
}
