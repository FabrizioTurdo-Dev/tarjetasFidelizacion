"use client";
import { useEffect, useState } from "react";
import { BASE, esIos } from "@/lib/util";

type Evento = Event & { prompt: () => Promise<void> };

// Chrome avisa que se puede instalar apenas carga la página, a veces antes de que React dibuje el botón:
// el aviso se guarda acá para no perderlo.
let guardado: Evento | null = null;
const avisar = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); guardado = e as Evento; avisar.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { guardado = null; avisar.forEach((f) => f()); });
}

/** Android: botón para dejar el ícono en la pantalla de inicio. Solo aparece si el navegador lo permite. */
export function BotonInstalar({ texto, className = "btn dark" }: { texto: string; className?: string }) {
  const [ev, setEv] = useState<Evento | null>(null);
  useEffect(() => {
    const f = () => setEv(guardado);
    f(); avisar.add(f);
    return () => { avisar.delete(f); };
  }, []);
  if (!ev) return null;
  return <button className={className} onClick={async () => { await ev.prompt(); guardado = null; setEv(null); }}>{texto}</button>;
}

/**
 * Ícono "Mis tarjetas" para Android. En iPhone NO se agrega: Safari usaría la dirección del manifiesto
 * y el ícono perdería el link secreto de la tarjeta (allá cada ícono guarda la dirección exacta en la que se creó,
 * y no comparte la memoria con Safari).
 */
export function ManifestCliente() {
  useEffect(() => {
    if (esIos() || document.querySelector('link[rel="manifest"]')) return;
    const l = document.createElement("link");
    l.rel = "manifest"; l.href = `${BASE}/manifest-cliente.webmanifest`;
    document.head.appendChild(l);
  }, []);
  return null;
}
