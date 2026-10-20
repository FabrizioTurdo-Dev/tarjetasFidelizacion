import type { Metadata } from "next";

// Ícono "Habitué" del negocio: abre el panel; manteniéndolo apretado en Android ofrece "Escanear".
export const metadata: Metadata = { manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest-negocio.webmanifest` };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
