import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function StudioNewLayout({ children }: { children: ReactNode }) {
  return children;
}
