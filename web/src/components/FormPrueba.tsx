"use client";
import { useEffect, useState } from "react";
import { evento, origenDelLink } from "@/lib/analytics";
import { rpcPublica } from "@/lib/rpc";
import { BASE, msg } from "@/lib/util";

// Formulario "Quiero probarlo" de la página principal (pedir_prueba). Fabri contacta a cada uno por WhatsApp.
export function FormPrueba() {
  const [f, setF] = useState({ negocio: "", rubro: "", ciudad: "", pais: "Argentina", nombre: "", whatsapp: "", email: "", como: "", web: "" });
  const [acepta, setAcepta] = useState(false);
  const [err, setErr] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);
  // Si llegó desde un anuncio (utm_source o gclid), "¿Cómo nos conociste?" arranca con ese dato; igual lo puede cambiar.
  useEffect(() => {
    const origen = origenDelLink(window.location.search);
    if (origen) setF((f) => (f.como ? f : { ...f, como: origen }));
  }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOcupado(true);
    const { error } = await rpcPublica("pedir_prueba", {
      p_negocio: f.negocio, p_rubro: f.rubro, p_ciudad: f.ciudad, p_pais: f.pais, p_nombre: f.nombre,
      p_whatsapp: f.whatsapp, p_email: f.email, p_como: f.como, p_acepta: acepta, p_web: f.web,
    });
    setOcupado(false);
    if (error) { setErr(msg(error)); return; }
    evento("pedir_prueba", { rubro: f.rubro.trim().toLowerCase() || "sin rubro" }); // conversión principal de Google Ads
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
      <label>Tu nombre<input required maxLength={80} autoComplete="name" value={f.nombre} onChange={set("nombre")} /></label>
      <label>WhatsApp<input required maxLength={30} inputMode="tel" autoComplete="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="11 2345 6789" /></label>
      {/* Lo opcional va plegado: el formulario corto se completa más (si llegó de un anuncio, "cómo nos conociste" ya viene cargado). */}
      <details className="l-mas">
        <summary>Más datos (opcional)</summary>
        <label>País<input maxLength={60} value={f.pais} onChange={set("pais")} /></label>
        <label>Mail<input type="email" maxLength={120} autoComplete="email" value={f.email} onChange={set("email")} /></label>
        <label>¿Cómo nos conociste?<input maxLength={200} value={f.como} onChange={set("como")} placeholder="Vi la tarjeta en otro local, Instagram…" /></label>
      </details>
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
