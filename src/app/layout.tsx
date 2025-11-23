import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export const metadata = {
  title: "Evidencia jázd",
  description: "Evidencia jázd – Truck Roman",
  themeColor: "#ffffff",
  // toto je dôležité:
  colorScheme: "light" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}
