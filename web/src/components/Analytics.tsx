"use client";
import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { evento } from "@/lib/analytics";

// Google Analytics (GA4), solo en las páginas públicas: la principal, la guía y la privacidad.
// Las tarjetas, las altas y los paneles no se miden: ahí hay datos de clientes de los negocios.
// Se activa con NEXT_PUBLIC_GTM_ID (Google Tag Manager, GTM-XXXXXXX: el GA4 se configura adentro de GTM)
// o con NEXT_PUBLIC_GA_ID (GA4 directo, G-XXXXXXXXXX). Usar uno solo, si no se cuentan doble las visitas.
// Sin ninguna de las dos no carga nada (local, por ejemplo).
const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const ID = process.env.NEXT_PUBLIC_GA_ID;
const PUBLICAS = ["/", "/guia", "/privacidad"];

export function Analytics() {
  const ruta = (usePathname() || "/").replace(/\/+$/, "") || "/";
  const activo = Boolean(GTM || ID) && PUBLICAS.includes(ruta);

  // Cualquier link a WhatsApp de estas páginas (pie "Desarrollado por", "Escribinos") cuenta como conversión secundaria.
  useEffect(() => {
    if (!activo) return;
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href*="wa.me/"]');
      if (a) evento("whatsapp_fabri");
    };
    document.addEventListener("click", clic);
    return () => document.removeEventListener("click", clic);
  }, [activo]);

  if (!activo) return null;
  return (
    <>
      <Script id="gtag-base" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${GTM ? "dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});" : ""}${ID ? `gtag('config','${ID}');` : ""}`}</Script>
      {GTM && <Script src={`https://www.googletagmanager.com/gtm.js?id=${GTM}`} strategy="afterInteractive" />}
      {ID && <Script src={`https://www.googletagmanager.com/gtag/js?id=${ID}`} strategy="afterInteractive" />}
    </>
  );
}
