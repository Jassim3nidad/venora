import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/src/components/providers";
import { SITE_URL } from "@/src/lib/site-url";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "7TH SOUTH STREET — Nonchalant Luxury. Underground Culture.",
    template: "%s | 7TH SOUTH STREET",
  },
  description:
    "Premium underground streetwear e-commerce and brand platform based in the Philippines.",
  keywords: [
    "streetwear",
    "fashion",
    "Philippines",
    "underground culture",
    "7TH SOUTH STREET",
  ],
  authors: [{ name: "7TH SOUTH STREET" }],
  creator: "7TH SOUTH STREET",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/venora-logo.png",
    shortcut: "/venora-logo.png",
    apple: "/venora-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "7TH SOUTH STREET",
    title: "7TH SOUTH STREET — Nonchalant Luxury. Underground Culture.",
    description:
      "Premium underground streetwear e-commerce and brand platform based in the Philippines.",
  },
  twitter: {
    card: "summary_large_image",
    title: "7TH SOUTH STREET — Nonchalant Luxury. Underground Culture.",
    description:
      "Premium underground streetwear e-commerce and brand platform based in the Philippines.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#080808" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
