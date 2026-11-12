import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getInvitationShell } from "@managevent/i18n";
import { celebrationTokens } from "@managevent/ui/tokens";
import { ToastProvider } from "@/components/ui/Toast";
import { UiCopyProvider } from "@/components/ui/UiCopy";
import { invitationUrl } from "@/lib/urls";
import "./globals.css";

const copy = getInvitationShell("en");

export const metadata: Metadata = {
  metadataBase: new URL(invitationUrl),
  title: { template: copy.meta.titleTemplate, default: copy.meta.defaultTitle },
  description: copy.meta.description,
  applicationName: copy.meta.siteName,
  // Guest names and private links must never be turned into phone or address links by iOS.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: celebrationTokens.surface,
};

/**
 * The root layout carries no chrome. Each area adds its own:
 * - `(site)`: the shared www header and footer (`SiteChrome`);
 * - `studio`: the Host Studio shell (`StudioShell`);
 * - `/i/*`, `/check-in/*`, legacy links: none (guest pages render in their own theme).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" dir="ltr">
      <body>
        <UiCopyProvider
          value={{
            ui: copy.ui,
            errorPage: copy.errorPage,
            networkError: copy.errors.NETWORK_ERROR,
          }}
        >
          <ToastProvider>{children}</ToastProvider>
        </UiCopyProvider>
      </body>
    </html>
  );
}
