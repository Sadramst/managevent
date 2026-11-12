import type { Metadata, Viewport } from "next";
import "./globals.css";

const invitationBaseUrl =
  process.env.NEXT_PUBLIC_INVITATION_URL || "https://invitation.managevent.com.au";

export const metadata: Metadata = {
  title: {
    template: "%s | Managevent Invitations",
    default: "Managevent Invitations — Luxury Digital Invitations & RSVP Studio (Australia)",
  },
  description:
    "End-to-end luxury digital event invitations, household RSVP management, encrypted dietary tracking, and QR door check-in for weddings, engagements, milestone birthdays, and memorials in Perth & Australia.",
  metadataBase: new URL(invitationBaseUrl),
  alternates: {
    canonical: invitationBaseUrl,
    languages: {
      "en-AU": invitationBaseUrl,
      "x-default": invitationBaseUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Managevent Invitations",
    title: "Managevent Invitations — Luxury Digital Invitations & RSVP Studio",
    description:
      "Bespoke digital ceremony invitations with household RSVPs, encrypted dietary tracking, and live catering sync for Perth and Australian events.",
    url: invitationBaseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Managevent Invitations — Luxury Digital Invitations & RSVP Studio",
    description:
      "Bespoke digital ceremony invitations with household RSVPs, encrypted dietary tracking, and live catering sync for Perth and Australian events.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#9e7d3b",
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Managevent Invitations",
  url: invitationBaseUrl,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "All",
  inLanguage: "en-AU",
  description:
    "Luxury digital ceremony and event invitations with household RSVPs, encrypted dietary tracking, QR passes, and live catering integration.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Starter Invitation",
      price: "0",
      priceCurrency: "AUD",
    },
    {
      "@type": "Offer",
      name: "Premium Event Pass",
      price: "69.00",
      priceCurrency: "AUD",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased selection:bg-amber-200 selection:text-amber-950">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
