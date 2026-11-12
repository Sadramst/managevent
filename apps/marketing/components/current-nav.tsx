"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Marks the header link for the page being viewed with `aria-current`, which the brand shell
 * styles with an underline. The layout is prerendered once for every page, so it cannot know
 * the path on the server; without JavaScript the header simply has no current marker.
 *
 * An exact match is `aria-current="page"`; a parent section (for example "Ceremonies" on a
 * ceremony page) is `aria-current="true"`.
 */
export function CurrentNav() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname.replace(/^\/en(?=\/|$)/, "").replace(/\/+$/, "") || "/";
    const links = document.querySelectorAll<HTMLAnchorElement>(
      '.site-header-bar a[href^="/"]:not(.site-brand)',
    );
    for (const link of links) {
      const href = (link.getAttribute("href") ?? "").split(/[?#]/)[0] ?? "";
      if (href !== "/" && path === href) link.setAttribute("aria-current", "page");
      else if (href !== "/" && path.startsWith(`${href}/`))
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }, [pathname]);

  return null;
}
