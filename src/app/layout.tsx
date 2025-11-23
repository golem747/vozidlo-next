import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evidencia jázd – Truck Roman",
  description: "Jednoduchá evidencia jázd pre tvoje vozidlá.",
  themeColor: "#ffffff",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      // klasická favicon
      { url: "/favicon.ico", sizes: "any" },
      // PWA / tab ikony
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        {/* vždy svetlá schéma */}
        <meta name="color-scheme" content="light" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
