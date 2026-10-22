"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { BASE, esIos, iniciales, marca, msg, socio, type EstadoCliente } from "@/lib/util";
import { Firma } from "@/components/Firma";
import { Qr } from "@/components/Qr";
import { BotonInstalar, ManifestCliente } from "@/components/Instalar";
import { agregarToken, tokensGuardados } from "@/lib/tarjetas";
import Link from "next/link";

function Tarjeta() {
  const q = useSearchParams();
  const k = q.get("k") || "";
  const nueva = q.has("nueva");
  const [c, setC] = useState<EstadoCliente | null>(null);
  const [err, setErr] = useState("");
  const [tuto, setTuto] = useState(false);
  const [ios, setIos] = useState(false);
  const [cantidad, setCantidad] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [puedeEnviar, setPuedeEnviar] = useState(false);
  const [resena, setResena] = useState<"" | "abierta" | "cerrada">("");

  useEffect(() => {
    const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIos(esIos());
    if (esIos() && !standalone) setTuto(true);
    setPuedeEnviar(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (q.has("demo")) {
      // Vista demo (/t/?demo=1): una tarjeta de ejemplo con 12 visitas.
      const vence = new Date(Date.now() + 47 * 864e5).toISOString();
      setC({ nombre: "Lucía", numero_socio: 42, visitas: 12, vence_el: vence, vencida: false, pedir_resena: true,
        negocio: { nombre: "Almadekh", color: "#7a3e2b", slug: "almadekh", logo_url: null, resenas_url: "https://g.page/r/ejemplo/review" },
        premios: [{ id: "a", visitas: 5, nombre: "Café de cortesía", ganado: true, canjeado: true },
          { id: "b", visitas: 10, nombre: "Postre gratis", ganado: true, canjeado: false },
          { id: "c", visitas: 20, nombre: "20% en la cuenta", ganado: false, canjeado: false },
          { id: "d", visitas: 100, nombre: "Cena para dos", ganado: false, canjeado: false }] });
      return;
    }
    if (!k) return;
    sb.rpc("tarjeta_por_token", { p_token: k }).then(({ data, error }) => {
      if (error) { setErr(msg(error)); return; }
      agregarToken(k); // queda en "Mis tarjetas" de este dispositivo
      setCantidad(tokensGuardados().length);
      setC(data as EstadoCliente);
    });
  }, [k, q]);

  if ((!k && !q.has("demo")) || err) return <main className="screen"><h1>Tarjeta no encontrada</h1><p className="muted">{err || "El link está incompleto."}</p></main>;
  if (!c) return <main className="screen"><p className="muted">Cargando tu tarjeta…</p></main>;

  const n = c.visitas;
  const P = [...c.premios].sort((a, b) => a.visitas - b.visitas);
  const sig = P.find((p) => p.visitas > n);
  const prev = [...P].reverse().find((p) => p.visitas <= n);
  const desde = prev ? prev.visitas : 0;
  const pct = sig ? Math.max(4, Math.round(((n - desde) / (sig.visitas - desde)) * 100)) : 100;
  const qrTexto = `${location.origin}${BASE}/t/?k=${k || "demo"}`;

  async function copiar() {
    try { await navigator.clipboard.writeText(qrTexto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { /* sin portapapeles: el link queda a la vista para copiarlo a mano */ }
  }
  async function enviar() {
    try { await navigator.share({ title: `Mi tarjeta de ${c!.negocio.nombre}`, url: qrTexto }); } catch { /* canceló */ }
  }
  // Anota que tocó el botón o lo descartó, para no volver a ofrecérselo. El link se abre igual aunque esto falle.
  function marcarResena(abrio: boolean) {
    setResena(abrio ? "abierta" : "cerrada");
    if (k && !q.has("demo")) sb.rpc("marcar_resena", { p_token: k, p_abrio: abrio }).then(() => {});
  }

  return (
    <main className="screen" style={marca(c.negocio.color)}>
      {cantidad > 1 && <Link href="/mis-tarjetas/" className="btn ghost">Ver mis {cantidad} tarjetas</Link>}
      {nueva && <div className="welcome">¡Listo, ya sos socio! Mostrá esta tarjeta en la caja para sumar tu primera visita.</div>}
      <section className="card" aria-label="Tarjeta de cliente">
        <div className="card-top">
          <div className="biz"><div className="logo">{iniciales(c.negocio.nombre)}</div>
            <div><strong>{c.negocio.nombre}</strong><p className="small" style={{ opacity: .85 }}>Hola, {c.nombre}</p></div></div>
          <div className="socio">Socio<b>{socio(c.numero_socio)}</b></div>
        </div>
        <div>
          <div className="count">{n} <small>{n === 1 ? "visita" : "visitas"}</small></div>
          <p className="small" style={{ opacity: .85, marginTop: 4 }}>
            {sig ? `Te ${sig.visitas - n === 1 ? "falta 1 visita" : `faltan ${sig.visitas - n} visitas`} para: ${sig.nombre}`
              : P.length ? "¡Llegaste al premio máximo! Gracias por venir siempre." : "Pronto vas a ver tus premios acá."}
          </p>
        </div>
        <div><div className="bar" aria-hidden><i style={{ width: pct + "%" }} /></div>
          <div className="bar-l"><span>{sig ? (prev ? prev.visitas + " ✓" : "0") : ""}</span><span>{sig ? sig.visitas : P.length ? P[P.length - 1].visitas + " ✓" : ""}</span></div></div>
        <div className="qrwrap"><Qr texto={qrTexto} /><span>Mostralo al pagar o decí tu número de socio</span></div>
      </section>

      {c.vence_el
        ? <p className="small muted">Tus visitas vencen el {new Date(c.vence_el).toLocaleDateString("es-AR")} si no volvés antes. Cada visita renueva el plazo.</p>
        : c.vencida ? <p className="small muted">Tu tarjeta venció por inactividad. Tu próxima visita cuenta como la primera.</p> : null}

      {/* Reseña en Google: se ofrece a todos por igual, sin nada a cambio (reglas de Google). */}
      {c.pedir_resena && c.negocio.resenas_url && resena !== "cerrada" && (resena === "abierta"
        ? <div className="welcome">¡Gracias por contar tu experiencia!</div>
        : <section className="box">
            <h2>¿Qué te pareció {c.negocio.nombre}?</h2>
            <p className="small muted">Ya viniste {n} veces. Si tenés un minuto, contá tu experiencia en Google: ayuda a que más gente conozca el lugar.</p>
            <div className="row2">
              <a className="btn" href={c.negocio.resenas_url} target="_blank" rel="noopener noreferrer" onClick={() => marcarResena(true)}>Dejar mi reseña</a>
              <button className="btn ghost" onClick={() => marcarResena(false)}>No, gracias</button>
            </div>
          </section>)}

      {ios && <button className="btn dark" onClick={() => setTuto(true)}>Guardar en la pantalla de inicio</button>}
      <BotonInstalar texto="Guardar en la pantalla de inicio" />

      <section className="box"><h2>Premios</h2>
        <div>{P.length ? P.map((p) => (
          <div className="pr" key={p.id}><span style={p.ganado ? { fontWeight: 600 } : undefined}>{p.nombre}</span>
            {p.canjeado ? <span className="chip c-neutral">Ya lo canjeaste</span>
              : p.ganado ? <span className="chip c-good">¡Ya lo ganaste!</span>
              : <span className="chip c-neutral">{p.visitas} visitas{p === sig ? ` · faltan ${p.visitas - n}` : ""}</span>}
          </div>)) : <p className="muted small">Este negocio todavía no cargó premios.</p>}</div>
        <p className="small muted">Tus visitas siguen sumando cuando canjeás un premio. Para canjear, mostrá la tarjeta en la caja.</p>
      </section>
      <section className="box"><h2>El link de tu tarjeta</h2>
        <p className="small muted">Guardalo para vos (por ejemplo, en tu propio chat de WhatsApp o en Notas): con este link abrís tu tarjeta desde cualquier celular, aunque cambies de teléfono. No lo compartas: quien lo tenga puede ver tu tarjeta.</p>
        <p className="linkt">{qrTexto}</p>
        <div className={puedeEnviar ? "row2" : undefined}>
          <button className="btn ghost" onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar link"}</button>
          {puedeEnviar && <button className="btn ghost" onClick={enviar}>Enviar…</button>}
        </div>
      </section>
      <p className="muted small" style={{ textAlign: "center" }}>Funciona con De la Casa · <Link href="/mis-tarjetas/">Mis tarjetas</Link></p>
      <Firma mensaje={`¡Hola, Fabrizio! Vi la tarjeta de ${c.negocio.nombre} en De la Casa y quiero una para mi negocio.`} />

      {tuto && (
        <div className="sheet" role="dialog" aria-labelledby="tuto-t">
          <h2 id="tuto-t">Tené tu tarjeta siempre a mano</h2>
          <p className="muted small">Guardala en tu iPhone como si fuera una app. Son 3 pasos.</p>
          <ol className="steps">
            <li><span>Tocá <b>Compartir</b> en la barra de Safari, abajo.</span></li>
            <li><span>Bajá y tocá <b>Agregar a inicio</b>.</span></li>
            <li><span>Tocá <b>Agregar</b>. Vas a ver el ícono De la Casa en tu pantalla: abre directo tu tarjeta de {c.negocio.nombre}.</span></li>
          </ol>
          <button className="btn" onClick={() => setTuto(false)}>Entendido</button>
        </div>
      )}
    </main>
  );
}

export default function Page() { return <><ManifestCliente /><Suspense><Tarjeta /></Suspense></>; }
