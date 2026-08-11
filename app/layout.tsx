import { AppProviders } from "@/components/AppProviders";
import {
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
  PRODUCT_TAB_TITLE,
  productSiteUrl,
} from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = productSiteUrl();
const description =
  "Product ad and video studio — create images and short videos for marketing.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: PRODUCT_TAB_TITLE,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description,
  applicationName: PRODUCT_NAME,
  keywords: [
    "AI video",
    "product ads",
    "marketing studio",
    "Seedance",
    "short video",
    "captions",
    "Alchemy AI Lab",
  ],
  authors: [{ name: PRODUCT_NAME }],
  creator: PRODUCT_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: PRODUCT_NAME,
    title: PRODUCT_TAB_TITLE,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_TAB_TITLE,
    description,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "og:logo": PRODUCT_LOGO_SRC,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
