import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return process.env.VERCEL_ENV === "preview"
    ? { rules: { userAgent: "*", disallow: "/" } }
    : {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/plan/estimate/"],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
      };
}
