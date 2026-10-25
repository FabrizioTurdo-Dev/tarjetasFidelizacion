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
  socio_inexistente: "No hay ningún socio con ese número en este negocio.",
  usuario_inexistente: "Ese mail todavía no tiene usuario.",
  clave_corta: "La contraseña tiene que tener al menos 8 caracteres.",
  mail_invalido: "Ese mail no parece válido.",
  email_exists: "Ese mail ya tiene usuario.",
  weak_password: "Esa contraseña es muy fácil de adivinar. Probá con otra (o tocá Generar).",
  same_password: "Esa ya es la contraseña actual.",
  reauthentication_needed: "Por seguridad, cerrá sesión, volvé a entrar y probá de nuevo.",
  es_superadmin: "La contraseña del superadmin no se cambia desde acá.",
  pedido_invalido: "Faltan datos para hacer eso.",
  premio_visitas: "Cada premio tiene que pedir entre 1 y 500 visitas.",
  premio_nombre: "Cada premio necesita un nombre (hasta 80 letras).",
  premios_demasiados: "Podés tener hasta 10 premios activos.",
  premios_repetidos: "Dos premios no pueden pedir la misma cantidad de visitas.",
  whatsapp_invalido: "Revisá el WhatsApp: escribilo con la característica, por ejemplo 11 2345 6789.",
  demasiados_pedidos: "Ya recibimos tu pedido. Te escribimos por WhatsApp en el día.",
  info_titulo: "El título puede tener hasta 60 letras.",
  info_texto: "El texto puede tener hasta 600 letras.",
  info_links_demasiados: "Podés poner hasta 6 links.",
  info_link_texto: "Cada link necesita un nombre (hasta 40 letras) y una descripción de hasta 80.",
  info_link_url: "Cada link tiene que empezar con https:// y no llevar espacios.",
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
/** Un link del bloque de información de la tarjeta (carta, Instagram, WhatsApp, un proyecto…). */
export type LinkInfo = { texto: string; detalle?: string; url: string };
export type Info = { titulo: string | null; texto: string | null; links: LinkInfo[] };

export type Negocio = {
  id: string; slug: string; nombre: string; rubro: string | null; color: string;
  espera_horas: number; vence_dias: number;
  estado: "prueba" | "activa" | "vencida" | "suspendida" | "cancelada";
  inicio_prueba: string;
  /** Link "Pedir reseñas" de su Perfil de Empresa de Google. */
  resenas_url?: string | null;
  /** De De la Casa (demo, el de Fabri): no cuenta en los números del resumen. */
  interno?: boolean;
  info_titulo?: string | null; info_texto?: string | null; info_links?: LinkInfo[];
};
export type EstadoCliente = {
  nombre: string; numero_socio: number; visitas: number; vence_el: string | null; vencida: boolean;
  negocio: { nombre: string; color: string; slug: string; logo_url: string | null; resenas_url?: string | null; info?: Info };
  /** Mostrar el botón de reseña (desde la 2ª visita, si el negocio tiene link y el cliente no lo usó ni lo descartó). */
  pedir_resena?: boolean;
  premios: Premio[];
};

/** iPhone o iPad (el iPad moderno se presenta como Mac con pantalla táctil). */
export const esIos = () => typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

export const socio =(n: number) => "#" + String(n).padStart(4, "0");
export const diasPrueba = (n: Pick<Negocio, "inicio_prueba">) => {
  const fin = new Date(n.inicio_prueba + "T00:00:00");
  fin.setDate(fin.getDate() + 30);
  return Math.ceil((fin.getTime() - Date.now()) / 864e5);
};

/** Link de WhatsApp a un número escrito a mano. Sin código de país se asume Argentina (54 9 + característica). */
export function linkWa(numero: string, texto: string): string {
  let d = (numero || "").replace(/\D/g, "");
  if (!numero.trim().startsWith("+") && !d.startsWith("54")) {
    d = d.replace(/^0/, "");
    if (d.length === 10) d = "549" + d;
  }
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
