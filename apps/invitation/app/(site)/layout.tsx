import type { ReactNode } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { getMeOptional } from "@/lib/session";

/**
 * Public pages and the sign-in pages: the same header and footer as www.managevent.com.au.
 * The header shows "My events" to a signed-in host and "Sign in" otherwise; if the API is
 * unreachable the pages still render, signed out.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const me = await getMeOptional();
  return <SiteChrome signedIn={me.user !== null}>{children}</SiteChrome>;
}
