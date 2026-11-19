/**
 * Defensive URL guards for browser redirects and host-supplied external links.
 * The API validates host URLs on write (`HttpsUrlSchema`), and the UI re-checks them before
 * placing them into `href`, `src`, or `window.location.assign` so tampered or unexpected values
 * can never inject `javascript:` URLs or trigger open redirects.
 */

const ALLOWED_CHECKOUT_HOSTS: ReadonlySet<string> = new Set(["checkout.stripe.com"]);

/** Returns a normalised `https://` URL string, or `null` for any other scheme or malformed URL. */
export function safeExternalHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * True when `url` is a safe destination for checkout navigation: either a same-origin Studio
 * checkout path (`/studio/...`, never protocol-relative `//...`) or Stripe's hosted checkout
 * (`https://checkout.stripe.com/...`).
 */
export function isSafeCheckoutRedirectUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith("/studio/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && ALLOWED_CHECKOUT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
