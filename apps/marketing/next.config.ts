import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 *
 * Pragmatic rather than strict: the App Router streams its payload through inline
 * `<script>self.__next_f.push(...)</script>` tags, so `script-src` needs `'unsafe-inline'`
 * unless every response carries a per-request nonce. Nonces would force every page to render
 * dynamically (no static prerendering, no CDN caching), which is the wrong trade for a public
 * marketing site with no third-party scripts. Everything else is locked to this origin:
 * no remote scripts, styles, fonts, frames or form targets.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
    value:
      "accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
];

const config: NextConfig = {
  poweredByHeader: false,
  webpack(configuration) {
    configuration.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return configuration;
  },
  transpilePackages: [
    "@managevent/ui",
    "@managevent/i18n",
    "@managevent/api-client",
    "@managevent/validators",
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
    ];
  },
  async redirects() {
    // Old and alias paths. These run before `proxy.ts`, so they use the public (unprefixed) URLs.
    const aliases: ReadonlyArray<readonly [source: string, destination: string]> = [
      ["/legal", "/privacy"],
      ["/legal/privacy", "/privacy"],
      ["/legal/terms", "/terms"],
      ["/legal/accessibility", "/accessibility"],
      ["/privacy-policy", "/privacy"],
      ["/terms-and-conditions", "/terms"],
      ["/plan", "/#estimator"],
      ["/plan/:path*", "/#estimator"],
      ["/estimator", "/#estimator"],
      ["/book", "/contact"],
      ["/enquire", "/contact"],
      ["/enquiry", "/contact"],
      ["/contact-us", "/contact"],
      ["/packages", "/pricing"],
      ["/packages/:path*", "/pricing"],
      ["/prices", "/pricing"],
      ["/hire", "/services#hire"],
      ["/invitation", "/invitations"],
      ["/invites", "/invitations"],
      ["/process", "/how-it-works"],
      ["/about-us", "/about"],
      ["/faqs", "/faq"],
      ["/memorial", "/memorials"],
      ["/venue", "/venues"],
      ["/ceremony", "/ceremonies"],
    ];
    return aliases.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default config;
