"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { BASE, msg } from "@/lib/util";

// Formulario "Quiero probarlo" de la página principal (pedir_prueba). Fabri contacta a cada uno por WhatsApp.
export function FormPrueba() {
  const [f, setF] = useState({ negocio: "", rubro: "", ciudad: "", pais: "Argentina", nombre: "", whatsapp: "", email: "", como: "", web: "" });
  const [acepta, setAcepta] = useState(false);
  const [err, setErr] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOcupado(true);
    const { error } = await sb.rpc("pedir_prueba", {
      p_negocio: f.negocio, p_rubro: f.rubro, p_ciudad: f.ciudad, p_pais: f.pais, p_nombre: f.nombre,
      p_whatsapp: f.whatsapp, p_email: f.email, p_como: f.como, p_acepta: acepta, p_web: f.web,
    });
    setOcupado(false);
    if (error) { setErr(msg(error)); return; }
    setListo(true);
  }

  if (listo) return (
    <div className="okmsg" role="status">¡Gracias, {f.nombre.trim().split(" ")[0]}! Te escribimos por WhatsApp en el día para dejar andando la tarjeta de {f.negocio.trim()}.</div>
  );

  return (
    <form className="box" onSubmit={enviar}>
      <label>Nombre del negocio<input required maxLength={80} value={f.negocio} onChange={set("negocio")} placeholder="Café Lunar" /></label>
      <div className="row2">
        <label>Rubro<input maxLength={60} value={f.rubro} onChange={set("rubro")} placeholder="Cafetería, peluquería…" /></label>
        <label>Ciudad<input maxLength={80} value={f.ciudad} onChange={set("ciudad")} placeholder="Escobar" /></label>
      </div>
      <label>País<input maxLength={60} value={f.pais} onChange={set("pais")} /></label>
      <label>Tu nombre<input required maxLength={80} autoComplete="name" value={f.nombre} onChange={set("nombre")} /></label>
      <label>WhatsApp<input required maxLength={30} inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="11 2345 6789" /></label>
      <label>Mail (opcional)<input type="email" maxLength={120} autoComplete="email" value={f.email} onChange={set("email")} /></label>
      <label>¿Cómo nos conociste? (opcional)<input maxLength={200} value={f.como} onChange={set("como")} placeholder="Vi la tarjeta en otro local, Instagram…" /></label>
      {/* Campo trampa para bots: las personas no lo ven. */}
      <input className="trampa" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={set("web")} name="web" />
      <label className="check"><input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>Acepto que De la Casa guarde estos datos para contactarme por la prueba. <a href={`${BASE}/privacidad/`} target="_blank" rel="noopener">Política de privacidad</a>.</span></label>
      {err && <div className="errmsg">{err}</div>}
      <button className="btn dark" disabled={ocupado || !acepta}>{ocupado ? "Enviando…" : "Quiero probarlo gratis"}</button>
      <p className="small muted" style={{ textAlign: "center" }}>Sin tarjeta de crédito. Te escribimos nosotros.</p>
    </form>
  );
}
