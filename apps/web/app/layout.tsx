import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/src/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Venora — Find & Book Your Perfect Venue",
    template: "%s | Venora",
  },
  description:
    "Discover and book stunning event venues across the Philippines. Weddings, corporate events, debuts, and more — all in one place.",
  keywords: ["venue booking", "event venues", "Philippines", "wedding venue", "corporate events"],
  authors: [{ name: "Venora" }],
  creator: "Venora",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "Venora",
    title: "Venora — Find & Book Your Perfect Venue",
    description:
      "Discover and book stunning event venues across the Philippines.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Venora — Find & Book Your Perfect Venue",
    description:
      "Discover and book stunning event venues across the Philippines.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(217 75% 55%)" },
    { media: "(prefers-color-scheme: dark)",  color: "hsl(217 50% 15%)" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={`${inter.variable} ${sora.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}