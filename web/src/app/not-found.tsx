"use client";
// Links viejos con /app/ (QR impresos, WhatsApp, íconos guardados): la app ahora vive en la raíz del dominio.
// Se resuelve acá y no en la config del hosting para que ande igual en cualquiera.
import { useEffect, useState } from "react";
import { BASE } from "@/lib/util";

export default function NoEncontrada() {
  const [reenviando, setReenviando] = useState(true);
  useEffect(() => {
    const { pathname, search, hash } = location;
    const viejo = `${BASE}/app`;
    if (pathname === viejo || pathname.startsWith(viejo + "/")) {
      location.replace(`${BASE}${pathname.slice(viejo.length) || "/"}${search}${hash}`);
    } else setReenviando(false);
  }, []);
  if (reenviando) return null;
  return (
    <main className="screen" style={{ gap: 14 }}>
      <h1>No encontramos esta página</h1>
      <p><a href={`${BASE}/`}>Ir a De la Casa</a></p>
    </main>
  );
}
