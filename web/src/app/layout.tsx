import type { Metadata, Viewport } from "next";
import "./globals.css";

import { OG, SITIO } from "@/lib/seo";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Cada sección elige su manifiesto (ícono de la pantalla de inicio) en su propio layout:
// negocio (panel, escanear, guía), admin, y el de clientes, que se agrega desde el navegador (ver ManifestCliente).
// La imagen para compartir vale para todas las páginas (también un link de tarjeta mandado por WhatsApp).
export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "De la Casa",
  description: "Tarjeta de fidelización virtual para comercios",
  openGraph: { siteName: "De la Casa", locale: "es_AR", type: "website", images: OG },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "De la Casa" },
  icons: {
    icon: [{ url: `${BASE}/icons/favicon-48.png`, sizes: "48x48" }, { url: `${BASE}/icons/icon-192.png`, sizes: "192x192" }],
    apple: `${BASE}/icons/apple-touch-icon.png`,
  },
  robots: { index: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f1ef" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: la página pública le agrega una clase a <html> antes de que cargue React (ver app/page.tsx).
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
