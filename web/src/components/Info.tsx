"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { linkWa, msg, type Info, type LinkInfo } from "@/lib/util";

// Bloque de información de la tarjeta: título, un texto corto y hasta 6 links (carta, Instagram, WhatsApp…).
// Lo editan el dueño (panel) y el superadmin (Administración) con guardar_info. Es público: lo ve todo el que tiene la tarjeta.
const MAX_LINKS = 6;

export const infoDeNegocio = (n: { info_titulo?: string | null; info_texto?: string | null; info_links?: LinkInfo[] }): Info =>
  ({ titulo: n.info_titulo ?? null, texto: n.info_texto ?? null, links: n.info_links ?? [] });

/** Lo que ve el cliente en su tarjeta. Si no hay nada cargado, no se muestra. */
export function BloqueInfo({ info, negocio }: { info?: Info; negocio: string }) {
  if (!info || (!info.texto && !info.links?.length)) return null;
  return (
    <section className="box">
      <h2>{info.titulo || `Sobre ${negocio}`}</h2>
      {info.texto && <p className="info-texto">{info.texto}</p>}
      {!!info.links?.length && <div className="enlaces">{info.links.map((l, i) => (
        <a key={i} className="enlace" href={l.url} target="_blank" rel="noopener noreferrer">
          <span><b>{l.texto}</b>{l.detalle && <small>{l.detalle}</small>}</span>
        </a>))}</div>}
    </section>
  );
}

/** Acepta un link sin https:// o un número de WhatsApp, y lo deja como link https. */
function normalizarUrl(u: string): string {
  const t = u.trim();
  if (/^[+\d\s()-]+$/.test(t) && t.replace(/\D/g, "").length >= 8) return linkWa(t, "").replace(/\?text=$/, "");
  if (/^http:\/\//i.test(t)) return "https://" + t.slice(7);
  if (t && !/^[a-z][a-z0-9+.-]*:/i.test(t)) return "https://" + t;
  return t;
}

export function EditorInfo({ negocioId, inicial, demo = false, onGuardado }: {
  negocioId: string;
  inicial: Info;
  demo?: boolean;
  onGuardado?: (info: Info) => void;
}) {
  const [guardado, setGuardado] = useState<Info>(inicial);
  const [info, setInfo] = useState<Info>(inicial);
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cambiarLink = (i: number, l: Partial<LinkInfo>) => setInfo({ ...info, links: info.links.map((x, j) => (j === i ? { ...x, ...l } : x)) });

  async function guardar() {
    setAviso(null);
    const links = info.links.map((l) => ({ texto: l.texto.trim(), ...(l.detalle?.trim() ? { detalle: l.detalle.trim() } : {}), url: normalizarUrl(l.url) }));
    if (links.some((l) => !l.texto || !l.url)) { setAviso({ ok: false, t: "Cada link necesita un nombre y una dirección." }); return; }
    if (links.some((l) => !/^https:\/\/[^\s<>"']+$/.test(l.url))) { setAviso({ ok: false, t: msg("info_link_url") }); return; }
    const nueva: Info = { titulo: info.titulo?.trim() || null, texto: info.texto?.trim() || null, links };
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setOcupado(true);
    const { error } = await sb.rpc("guardar_info", { p_negocio: negocioId, p_titulo: nueva.titulo, p_texto: nueva.texto, p_links: nueva.links });
    setOcupado(false);
    if (error) { setAviso({ ok: false, t: msg(error) }); return; }
    setInfo(nueva); setGuardado(nueva);
    onGuardado?.(nueva);
    setAviso({ ok: true, t: "Guardado. Tus clientes ya lo ven en su tarjeta." });
  }

  const hayCambios = JSON.stringify(info) !== JSON.stringify(guardado);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label>Título<input value={info.titulo ?? ""} maxLength={60} placeholder="Sobre nosotros" onChange={(e) => setInfo({ ...info, titulo: e.target.value })} /></label>
      <label>Texto<textarea rows={4} maxLength={600} value={info.texto ?? ""} placeholder="Quiénes son, qué los hace distintos, horarios…" onChange={(e) => setInfo({ ...info, texto: e.target.value })} /></label>
      {info.links.map((l, i) => (
        <div key={i} className="prem" style={{ gridTemplateColumns: "1fr auto", alignItems: "start", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="row2">
              <label>Nombre del link<input value={l.texto} maxLength={40} placeholder="Nuestra carta" onChange={(e) => cambiarLink(i, { texto: e.target.value })} /></label>
              <label>Descripción (opcional)<input value={l.detalle ?? ""} maxLength={80} placeholder="Precios actualizados" onChange={(e) => cambiarLink(i, { detalle: e.target.value })} /></label>
            </div>
            <label>Dirección o WhatsApp<input value={l.url} maxLength={300} inputMode="url" placeholder="https://instagram.com/tunegocio o 11 2345 6789" onChange={(e) => cambiarLink(i, { url: e.target.value })} /></label>
          </div>
          <button className="x" aria-label="Quitar link" style={{ marginTop: 22 }} onClick={() => setInfo({ ...info, links: info.links.filter((_, j) => j !== i) })}>✕</button>
        </div>))}
      <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} disabled={info.links.length >= MAX_LINKS}
        onClick={() => setInfo({ ...info, links: [...info.links, { texto: "", url: "" }] })}>+ Agregar link</button>
      <p className="small muted">Aparece en la tarjeta de tus clientes, debajo de los premios. Si no cargás texto ni links, no se muestra. Para WhatsApp alcanza con escribir el número.</p>
      {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
      {hayCambios && <button className="btn dark" disabled={ocupado} onClick={guardar}>{ocupado ? "Guardando…" : "Guardar información"}</button>}
    </div>
  );
}
