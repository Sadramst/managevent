import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Managevent Invitations",
    default: "Managevent Invitations — Luxury Digital Invitations & RSVP",
  },
  description:
    "End-to-end luxury digital event invitations, RSVP management, dietary tracking, and check-in for weddings, engagements, anniversaries, and memorials.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_INVITATION_URL || "https://invitation.managevent.com.au",
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#9e7d3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-950">
        {children}
      </body>
    </html>
  );
}
