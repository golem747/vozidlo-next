import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evidencia jázd – Truck Roman",
  description: "Jednoduchá evidencia jázd pre tvoje vozidlá.",
  themeColor: "#ffffff",         // svetlá farba pre PWA / prehliadač
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        {/* donútime prehliadač brať len svetlú schému */}
        <meta name="color-scheme" content="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}
