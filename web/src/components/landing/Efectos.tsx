"use client";
import { useEffect } from "react";

// Efectos de la página pública: cada bloque .rv aparece al entrar en pantalla y el encabezado
// se marca al bajar. Sin JavaScript todo se ve igual, quieto (la clase rv-on la pone un script en la página).
export function Efectos() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));
    // Las secciones fuera de pantalla pausan sus animaciones en bucle (ver .quieto en globals.css).
    const fuera = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("quieto", !e.isIntersecting)));
    document.querySelectorAll(".l-hero, .l-sec").forEach((el) => fuera.observe(el));
    const cab = document.querySelector(".l-head");
    let bajo = false;
    const alBajar = () => { const b = window.scrollY > 8; if (b !== bajo) { bajo = b; cab?.classList.toggle("bajo", b); } };
    alBajar();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => { io.disconnect(); fuera.disconnect(); window.removeEventListener("scroll", alBajar); };
  }, []);
  return null;
}
