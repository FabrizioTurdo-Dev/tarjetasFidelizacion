"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Casa } from "./Tarjeta";

// Logo del encabezado y del pie de la página pública. Si ya estamos en la portada (por ejemplo, después de
// tocar "Precios" y quedar en /#precios), Next no vuelve arriba solo: lo hacemos a mano y sacamos el #.
export function Logo() {
  const ruta = usePathname();
  const enInicio = (ruta || "/").replace(/\/+$/, "") === "";
  return (
    <Link
      href="/"
      className="l-logo"
      onClick={(e) => {
        if (!enInicio) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      }}
    >
      <Casa /> De la Casa
    </Link>
  );
}
