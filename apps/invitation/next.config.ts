import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  transpilePackages: ["@managevent/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/anniversary",
        destination: "/legacy/anniversary",
      },
      {
        source: "/anniversary/:guestSlug",
        destination: "/legacy/anniversary/:guestSlug",
      },
      {
        source: "/e/:eventSlug/:guestSlug",
        destination: "/legacy/e/:eventSlug/:guestSlug",
      },
    ];
  },
  async headers() {
    return [
      // Standard security headers on all routes
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // Privacy rule (WEBSITE.md §B2, AGENTS.md):
      // noindex, nofollow, noarchive header on all private/guest/studio routes
      {
        source: "/i/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/studio/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/display/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        source: "/legacy/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
