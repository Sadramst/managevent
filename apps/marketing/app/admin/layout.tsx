import type { ReactNode } from "react";
import { getAdminPages, getDir } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { Metadata } from "next";
import { siteUrl } from "../../lib/site";
import "../globals.css";
import "./admin.css";

const copy = getAdminPages("en");

/**
 * The staff console is a separate root layout: no public header, footer or sitemap entry.
 * Nothing under it is ever indexed (`proxy.ts` adds `X-Robots-Tag` and `Cache-Control` too).
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: copy.shell.productLabel, template: `%s | ${copy.shell.titleSuffix}` },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  referrer: "same-origin",
};

/** Every console page depends on the visitor's session, so none is prerendered or cached. */
export const dynamic = "force-dynamic";

/**
 * An enquiry about a funeral, memorial or wake renders in Memorial Mode (its `<main>` carries
 * `data-experience-mode="memorial"`); this rule gives the header bar the same calm palette.
 */
const memorialPageCss = `body:has(> main[data-experience-mode="memorial"]){${Object.entries(
  getCssVariablesForMode("MEMORIAL"),
)
  .map(([name, value]) => `${name}:${value}`)
  .join(";")}}`;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" dir={getDir("en")}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: memorialPageCss }} />
      </head>
      <body>
        <a className="skip" href="#main">
          {copy.shell.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
