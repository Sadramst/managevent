import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 *
 * Pragmatic rather than strict, for the same reason as www: the App Router streams its payload
 * through inline `<script>self.__next_f.push(...)</script>` tags, so `script-src` needs
 * `'unsafe-inline'` unless every response carries a per-request nonce. Everything else is locked
 * to this origin, with three deliberate openings:
 *
 * - `img-src https:` and `media-src https:`: hosts supply their own cover, gallery and music
 *   URLs (there are no uploads yet). They are rendered with a plain `<img loading="lazy"
 *   referrerpolicy="no-referrer">`, never through the Next image optimiser.
 * - `form-action https://checkout.stripe.com`: the upgrade form posts to a server action that
 *   redirects to Stripe Checkout. Browsers apply `form-action` to that redirect too.
 * - The browser never calls the API directly (`connect-src 'self'`): auth goes through the
 *   same-origin `/api/auth/*` proxy and everything else through server components and actions.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "manifest-src 'self'",
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The camera is allowed for this origin only: door check-in scans QR passes with it.
    value:
      "accelerometer=(), browsing-topics=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
];

/**
 * Everything except `/` and `/templates` is private or transactional and must never be indexed.
 * Pages also set the robots meta tag; this is the HTTP header half (apps/invitation/AGENTS.md).
 */
const noindexSources = [
  "/i/:path*",
  "/studio/:path*",
  "/check-in/:path*",
  "/sign-in/:path*",
  "/sign-up",
  "/reset-password",
  "/unsubscribe",
  "/pricing",
  "/legacy/:path*",
  "/anniversary/:path*",
  "/e/:path*",
  "/api/:path*",
];
const noindexHeader = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };

/**
 * Request paths `next dev` must not print (it logs every incoming request by default; `next
 * start` logs none). Each of these carries a credential in its path or query: a guest link
 * (`/i/{eventSlug}/{guestToken}`), an old guest link, an email-preferences token, a password
 * reset token or an emailed sign-in link. AGENTS.md section 3: never log tokens or guest URLs.
 */
export const unloggedRequests: RegExp[] = [
  /^\/i\//,
  /^\/legacy\//,
  /^\/anniversary(\/|\?|$)/,
  /^\/e\//,
  /^\/unsubscribe(\/|\?|$)/,
  /^\/reset-password(\/|\?|$)/,
  /^\/api\/auth\//,
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: false,
  // `next dev` prints every server action call with its arguments. Ours carry guest names,
  // contact details and guest links (credentials), which must never reach a log.
  // It also prints the path of every incoming request. `unloggedRequests` keeps the paths that
  // carry a credential out of the terminal and of any captured dev or CI log.
  logging: { serverFunctions: false, incomingRequests: { ignore: unloggedRequests } },
  webpack(configuration) {
    configuration.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return configuration;
  },
  transpilePackages: [
    "@managevent/ui",
    "@managevent/i18n",
    "@managevent/api-client",
    "@managevent/validators",
    "@managevent/payments",
    "@managevent/types",
    "@managevent/config",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          ...(process.env.VERCEL_ENV === "preview"
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
      ...noindexSources.map((source) => ({ source, headers: [noindexHeader] })),
    ];
  },
};

export default config;
