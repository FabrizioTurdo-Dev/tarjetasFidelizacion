import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Cada sección elige su manifiesto (ícono de la pantalla de inicio) en su propio layout:
// negocio (panel, escanear, guía), admin, y el de clientes, que se agrega desde el navegador (ver ManifestCliente).
export const metadata: Metadata = {
  title: "De la Casa",
  description: "Tarjeta de fidelización virtual para comercios",
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
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
