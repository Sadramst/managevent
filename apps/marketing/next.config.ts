import type { NextConfig } from "next";

const config: NextConfig = {
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
    return process.env.VERCEL_ENV === "preview"
      ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
      : [];
  },
};

export default config;
