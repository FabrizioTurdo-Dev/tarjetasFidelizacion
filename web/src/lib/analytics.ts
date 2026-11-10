// Eventos para Google Analytics (y, desde ahí, conversiones de Google Ads). Si no cargó nada, no hace nada.
// Con Tag Manager el evento llega como {event: nombre} al dataLayer: en GTM se usa un activador "Evento personalizado" con ese nombre.
// Nunca mandar datos personales (nombre, teléfono, mail): solo el nombre del evento y datos generales.

/** Contenedor de Google Tag Manager de De la Casa (no es secreto). Se puede cambiar con NEXT_PUBLIC_GTM_ID. */
export const GTM = process.env.NEXT_PUBLIC_GTM_ID || "GTM-N54LWTSP";

export function evento(nombre: string, datos?: Record<string, string | number>) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer?.push({ event: nombre, ...datos });
}

/** Texto para "¿Cómo nos conociste?" según los parámetros del link (utm_source o gclid de Google Ads). */
export function origenDelLink(busqueda: string) {
  const p = new URLSearchParams(busqueda);
  const fuente = p.get("utm_source") || (p.get("gclid") ? "google" : "");
  if (!fuente) return "";
  const campania = p.get("utm_campaign");
  const nombre = fuente === "google" ? "Anuncio de Google" : `Anuncio (${fuente})`;
  return campania ? `${nombre} · ${campania}` : nombre;
}
