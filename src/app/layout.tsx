import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

import { AuthProvider } from "@/lib/auth";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { DEFAULT_OG_IMAGE_PATH, DEFAULT_OG_IMAGE_SIZE, getSiteUrl } from "@/lib/seo/config";

import "./globals.css";

// T71 : titre/description enrichis pour le SEO local — « Conakry, Guinée »,
// « achat et vente en ligne » et les notions clés (prix en GNF, contact
// direct vendeur, paiement à la livraison) doivent apparaître dès la landing
// pour qu'une recherche « site de vente en ligne en Guinée » remonte Makinum.
const SITE_TITLE = "Makinum — achat et vente en ligne à Conakry, Guinée";
const SITE_DESCRIPTION =
  "Makinum est le site d'achat et vente en ligne local en Guinée : trouve des produits près de " +
  "chez toi à Conakry, vois le prix en GNF, contacte directement le vendeur et paie à la livraison.";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: "%s · Makinum",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Makinum",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Makinum",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_GN",
    siteName: "Makinum",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE_PATH, ...DEFAULT_OG_IMAGE_SIZE, alt: "Makinum" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_PATH],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F3D2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
