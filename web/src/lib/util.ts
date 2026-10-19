import type { CSSProperties } from "react";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const ERRORES: Record<string, string> = {
  falta_aceptar_privacidad: "Tenés que aceptar la política de privacidad.",
  negocio_no_disponible: "Este negocio no está disponible por ahora.",
  falta_contacto: "Pasanos un teléfono o un mail.",
  ya_registrado: "Ese teléfono o mail ya tiene una tarjeta en este negocio.",
  tarjeta_invalida: "No encontramos esa tarjeta.",
  sin_permiso: "No tenés permiso para hacer esto.",
  negocio_inactivo: "La cuenta del negocio no está activa.",
  tarjeta_vencida: "La tarjeta venció: hay que sumar una visita para reiniciarla.",
  premio_invalido: "Ese premio no existe.",
  visitas_insuficientes: "Todavía no llegó a las visitas de ese premio.",
  ya_canjeado: "Ese premio ya fue entregado.",
  usuario_inexistente: "Ese mail no tiene usuario. Crealo primero en Supabase Auth.",
  "Invalid login credentials": "Mail o contraseña incorrectos.",
};

export function msg(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(ERRORES)) if (m.includes(k)) return ERRORES[k];
  if (m.includes("duplicate key")) return "Ya existe uno con ese dato (por ejemplo, un slug o unas visitas repetidas).";
  return "Algo salió mal: " + m;
}

export const iniciales = (n: string) =>
  (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function tinta(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#fff7f2";
  const n = parseInt(m[1], 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1c1a19" : "#fff7f2";
}

/** Variables CSS con el color del comercio. */
export function marca(color: string): CSSProperties {
  return {
    ["--marca" as string]: color,
    ["--marca-ink" as string]: tinta(color),
    ["--marca-soft" as string]: `color-mix(in srgb, ${color} 16%, var(--surface))`,
  };
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export type Premio = { id: string; visitas: number; nombre: string; activo?: boolean; ganado?: boolean; canjeado?: boolean };
export type Negocio = {
  id: string; slug: string; nombre: string; rubro: string | null; color: string;
  espera_horas: number; vence_dias: number;
  estado: "prueba" | "activa" | "vencida" | "suspendida" | "cancelada";
  inicio_prueba: string;
};
export type EstadoCliente = {
  nombre: string; numero_socio: number; visitas: number; vence_el: string | null; vencida: boolean;
  negocio: { nombre: string; color: string; slug: string; logo_url: string | null };
  premios: Premio[];
};

export const socio =(n: number) => "#" + String(n).padStart(4, "0");
export const diasPrueba = (n: Pick<Negocio, "inicio_prueba">) => {
  const fin = new Date(n.inicio_prueba + "T00:00:00");
  fin.setDate(fin.getDate() + 30);
  return Math.ceil((fin.getTime() - Date.now()) / 864e5);
};
