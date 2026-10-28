"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { linkWa, msg, slugify } from "@/lib/util";

// Pedidos del formulario "Quiero probarlo". Fabri les escribe por WhatsApp y, si siguen, crea el negocio desde acá.
export type Solicitud = {
  id: string; created_at: string; negocio: string; rubro: string | null; ciudad: string | null; pais: string | null;
  nombre: string; whatsapp: string; email: string | null; como_nos_conocio: string | null;
  estado: "nueva" | "contactada" | "habilitada" | "descartada"; negocio_id: string | null;
  /** Llegó después de lanzar la promoción: al habilitarla, si quedan lugares, el negocio es socio fundador. */
  para_fundador?: boolean;
};

const ESTADOS: Record<Solicitud["estado"], [string, string]> = {
  nueva: ["c-warn", "Nueva"], contactada: ["c-neutral", "Contactada"], habilitada: ["c-good", "Habilitada"], descartada: ["c-neutral", "Descartada"],
};

export function Solicitudes({ lista, demo = false, lugares, onCambio, onCreado }: {
  lista: Solicitud[] | null;
  demo?: boolean;
  /** Lugares de socio fundador libres (de 10). */
  lugares?: number;
  onCambio: () => void;
  onCreado: (negocioId: string) => void;
}) {
  const [filtro, setFiltro] = useState<"abiertas" | "todas">("abiertas");
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  if (!lista) return <p className="muted">Cargando…</p>;
  const visibles = filtro === "todas" ? lista : lista.filter((s) => s.estado === "nueva" || s.estado === "contactada");

  async function estado(s: Solicitud, e: Solicitud["estado"]) {
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    const { error } = await sb.from("solicitudes").update({ estado: e }).eq("id", s.id);
    if (error) setAviso({ ok: false, t: msg(error) }); else onCambio();
  }

  // Al abrir WhatsApp, una solicitud nueva pasa a "contactada".
  function escribir(s: Solicitud) {
    if (s.estado === "nueva" && !demo) estado(s, "contactada");
  }

  // Crea el negocio con los datos del pedido y guarda el contacto del dueño (privado).
  async function crear(s: Solicitud) {
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setAviso(null);
    const base = slugify(s.negocio) || "negocio";
    let r = await sb.from("negocios").insert({ slug: base.length >= 2 ? base : base + "-1", nombre: s.negocio.slice(0, 80), rubro: s.rubro }).select("id").single();
    if (r.error && r.error.message.includes("duplicate")) {
      r = await sb.from("negocios").insert({ slug: `${base.slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`, nombre: s.negocio.slice(0, 80), rubro: s.rubro }).select("id").single();
    }
    if (r.error || !r.data) { setAviso({ ok: false, t: msg(r.error) }); return; }
    const id = (r.data as { id: string }).id;
    const nota = [`Pidió la prueba el ${new Date(s.created_at).toLocaleDateString("es-AR")}.`,
      [s.ciudad, s.pais].filter(Boolean).join(", "), s.email && `Mail: ${s.email}`, s.como_nos_conocio && `Nos conoció por: ${s.como_nos_conocio}`]
      .filter(Boolean).join(" ");
    await sb.from("negocios_privado").upsert({ negocio_id: id, contacto_nombre: s.nombre, contacto_whatsapp: s.whatsapp, notas: nota });
    await sb.from("solicitudes").update({ estado: "habilitada", negocio_id: id }).eq("id", s.id);
    onCambio();
    onCreado(id);
  }

  return (
    <section className="box">
      <div className="top" style={{ flexWrap: "wrap" }}>
        <h2>Solicitudes de prueba</h2>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as "abiertas" | "todas")} style={{ width: "auto" }}>
          <option value="abiertas">Nuevas y contactadas</option><option value="todas">Todas</option></select>
      </div>
      <p className="small muted">Llegan desde el formulario de la página principal. Escribiles por WhatsApp en el día; si siguen, tocá "Crear negocio" y terminá de armar la tarjeta.</p>
      {lugares !== undefined && <p className="small muted">Socios fundadores: {lugares ? `quedan ${lugares} de 10 lugares. Cada negocio que creás desde una solicitud nueva ocupa uno (a los que cargás vos, marcalos en Negocios).` : "ya no quedan lugares."}</p>}
      {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
      {!visibles.length && <p className="muted small">No hay solicitudes {filtro === "abiertas" ? "pendientes" : "todavía"}.</p>}
      {visibles.map((s) => {
        const e = ESTADOS[s.estado];
        const texto = `¡Hola ${s.nombre}! Soy Fabrizio, de De la Casa. Vi que pediste la prueba para ${s.negocio}. ¿Te cuento cómo funciona y lo dejamos andando?`;
        return (
          <div key={s.id} className="pr" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{s.negocio}{s.rubro ? <span className="muted" style={{ fontWeight: 400 }}> · {s.rubro}</span> : null}</strong>
              <span style={{ display: "flex", gap: 4 }}>
                {s.para_fundador && !s.negocio_id && !!lugares && <span className="chip c-warn" title="Si la habilitás con «Crear negocio», entra como socio fundador">Entra como fundador</span>}
                <span className={"chip " + e[0]}>{e[1]}</span></span>
            </div>
            <span className="small">{s.nombre} · {s.whatsapp}{s.email ? ` · ${s.email}` : ""}</span>
            <span className="small muted">{[s.ciudad, s.pais].filter(Boolean).join(", ") || "Sin ciudad"} · {new Date(s.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}{s.como_nos_conocio ? ` · Nos conoció por: ${s.como_nos_conocio}` : ""}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a className="btn dark sm" href={linkWa(s.whatsapp, texto)} target="_blank" rel="noopener noreferrer" onClick={() => escribir(s)}>Escribir por WhatsApp</a>
              {s.negocio_id ? <button className="x" onClick={() => onCreado(s.negocio_id!)}>Ver el negocio</button>
                : <button className="x" onClick={() => crear(s)}>Crear negocio</button>}
              <select value={s.estado} onChange={(ev) => estado(s, ev.target.value as Solicitud["estado"])} style={{ width: "auto", padding: "8px 10px" }}>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select>
            </div>
          </div>);
      })}
    </section>
  );
}
