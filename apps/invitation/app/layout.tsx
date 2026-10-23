import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fa",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Managevent Invitations",
    default: "Managevent Invitations — Luxury Digital Invitations & RSVP",
  },
  description:
    "End-to-end luxury digital event invitations, RSVP management, dietary tracking, and check-in for weddings, Persian ceremonies, anniversaries, and memorials.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_INVITATION_URL || "https://invitation.managevent.com.au"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#9e7d3b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jakarta.variable} ${vazirmatn.variable}`}
    >
      <body className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-950">
        {children}
      </body>
    </html>
  );
}
