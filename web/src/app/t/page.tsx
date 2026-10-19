"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { BASE, iniciales, marca, msg, socio, type EstadoCliente } from "@/lib/util";
import { Qr } from "@/components/Qr";
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

  useEffect(() => {
    const esIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIos(esIos);
    if (esIos && !standalone) setTuto(true);
  }, []);

  useEffect(() => {
    if (q.has("demo")) {
      // Vista demo (/t/?demo=1): una tarjeta de ejemplo con 12 visitas.
      const vence = new Date(Date.now() + 47 * 864e5).toISOString();
      setC({ nombre: "Lucía", numero_socio: 42, visitas: 12, vence_el: vence, vencida: false,
        negocio: { nombre: "Almadekh", color: "#7a3e2b", slug: "almadekh", logo_url: null },
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
        <div className="qrwrap"><Qr texto={qrTexto} /><span>Mostralo al pagar</span></div>
      </section>

      {c.vence_el
        ? <p className="small muted">Tus visitas vencen el {new Date(c.vence_el).toLocaleDateString("es-AR")} si no volvés antes. Cada visita renueva el plazo.</p>
        : c.vencida ? <p className="small muted">Tu tarjeta venció por inactividad. Tu próxima visita cuenta como la primera.</p> : null}

      {ios && <button className="btn dark" onClick={() => setTuto(true)}>Guardar en la pantalla de inicio</button>}

      <section className="box"><h2>Premios</h2>
        <div>{P.length ? P.map((p) => (
          <div className="pr" key={p.id}><span style={p.ganado ? { fontWeight: 600 } : undefined}>{p.nombre}</span>
            {p.canjeado ? <span className="chip c-neutral">Ya lo canjeaste</span>
              : p.ganado ? <span className="chip c-good">¡Ya lo ganaste!</span>
              : <span className="chip c-neutral">{p.visitas} visitas{p === sig ? ` · faltan ${p.visitas - n}` : ""}</span>}
          </div>)) : <p className="muted small">Este negocio todavía no cargó premios.</p>}</div>
        <p className="small muted">Tus visitas siguen sumando cuando canjeás un premio. Para canjear, mostrá la tarjeta en la caja.</p>
      </section>
      <p className="muted small" style={{ textAlign: "center" }}>Funciona con Habitué · <Link href="/mis-tarjetas/">Mis tarjetas</Link></p>

      {tuto && (
        <div className="sheet" role="dialog" aria-labelledby="tuto-t">
          <h2 id="tuto-t">Tené tu tarjeta siempre a mano</h2>
          <p className="muted small">Guardala en tu iPhone como si fuera una app. Son 3 pasos.</p>
          <ol className="steps">
            <li><span>Tocá <b>Compartir</b> en la barra de Safari, abajo.</span></li>
            <li><span>Bajá y tocá <b>Agregar a inicio</b>.</span></li>
            <li><span>Tocá <b>Agregar</b>. Vas a ver el ícono de {c.negocio.nombre} en tu pantalla.</span></li>
          </ol>
          <button className="btn" onClick={() => setTuto(false)}>Entendido</button>
        </div>
      )}
    </main>
  );
}

export default function Page() { return <Suspense><Tarjeta /></Suspense>; }
