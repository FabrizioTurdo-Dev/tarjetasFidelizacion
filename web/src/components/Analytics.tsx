"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { evento } from "@/lib/analytics";

// La etiqueta de Google (Tag Manager) va en el HTML de las páginas públicas: ver EtiquetaGoogle.tsx.
// Acá solo se escuchan los clics: cualquier link a WhatsApp de esas páginas (pie "Desarrollado por", "Escribinos")
// cuenta como conversión secundaria. Las tarjetas, las altas y los paneles no se miden.
const PUBLICAS = ["/", "/guia", "/privacidad"];

export function Analytics() {
  const ruta = (usePathname() || "/").replace(/\/+$/, "") || "/";
  const activo = PUBLICAS.includes(ruta);

  useEffect(() => {
    if (!activo) return;
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href*="wa.me/"]');
      if (a) evento("whatsapp_fabri");
    };
    document.addEventListener("click", clic);
    return () => document.removeEventListener("click", clic);
  }, [activo]);

  return null;
}
