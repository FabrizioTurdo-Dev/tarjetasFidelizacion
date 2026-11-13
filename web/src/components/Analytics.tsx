"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { evento } from "@/lib/analytics";

// La etiqueta de Google (Tag Manager) va en el HTML de las páginas públicas: ver EtiquetaGoogle.tsx.
// Acá se escucha qué hace la gente en esas páginas (las tarjetas, las altas y los paneles no se miden):
//  - whatsapp_fabri: tocó cualquier link a WhatsApp (pie "Desarrollado por", "Escribinos"). Conversión secundaria.
//  - clic_probar {donde}: tocó un botón "Probalo gratis" (lleva al formulario). donde = encabezado, portada, precios, fundador, barra.
//  - clic_demo {donde}: tocó "Probá la demo".
//  - ver_seccion {seccion}: llegó bajando a una sección de la portada (como, demo, precios, preguntas, probar). Una vez por visita.
// Salen con gtag (lib/analytics.ts) y llegan a GA4 sin configurar nada en Tag Manager.
const PUBLICAS = ["/", "/guia", "/privacidad"];
const SECCIONES = ["como", "demo", "precios", "preguntas", "probar"];

/** Desde qué parte de la página se tocó un botón (para saber cuál funciona). */
function donde(a: Element) {
  if (a.closest(".l-head")) return "encabezado";
  if (a.closest(".l-hero")) return "portada";
  if (a.closest(".l-fund")) return "fundador";
  if (a.closest("#precios")) return "precios";
  if (a.closest(".l-barra")) return "barra";
  return "otro";
}

export function Analytics() {
  const ruta = (usePathname() || "/").replace(/\/+$/, "") || "/";
  const activo = PUBLICAS.includes(ruta);

  useEffect(() => {
    if (!activo) return;
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.includes("wa.me/")) evento("whatsapp_fabri");
      else if (href.endsWith("#probar")) evento("clic_probar", { donde: donde(a) });
      else if (href.endsWith("#demo")) evento("clic_demo", { donde: donde(a) });
    };
    document.addEventListener("click", clic);

    // Hasta dónde bajan: cada sección avisa la primera vez que entra en pantalla.
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      evento("ver_seccion", { seccion: e.target.id });
      io.unobserve(e.target);
    }), { threshold: 0.25 });
    SECCIONES.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });

    return () => { document.removeEventListener("click", clic); io.disconnect(); };
  }, [activo]);

  return null;
}
