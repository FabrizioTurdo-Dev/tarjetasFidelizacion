"use client";
import { useState } from "react";
import { Qr } from "@/components/Qr";
import { PREMIOS_DEMO, PremiosCelu, TarjetaCelu, Telefono } from "./Tarjeta";

// Demo para tocar: el escáner del negocio a la izquierda y la tarjeta de Lucía a la derecha.
// Respeta las reglas reales: espera entre visitas, premio que se entrega una vez, visitas que no se descuentan.
// Lucía ya es socia: tiene 1 visita y el primer premio (el de bienvenida) ya canjeado.
const INICIO = 1;
const CANJEADOS_INICIO = [1];
const HORA_INICIO = 10 * 60 + 15; // en minutos: hoy a las 10:15
const ESPERA = 6 * 60;

type Res = null | { tipo: "ok"; n: number } | { tipo: "espera"; proxima: number } | { tipo: "canje"; premio: string };

const hora = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dia = (m: number) => { const d = Math.floor(m / 1440); return d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`; };

export function Demo() {
  const [v, setV] = useState(INICIO);
  const [ahora, setAhora] = useState(HORA_INICIO);
  const [ultima, setUltima] = useState<number | null>(null);
  const [canjeados, setCanjeados] = useState<number[]>(CANJEADOS_INICIO);
  const [res, setRes] = useState<Res>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [golpe, setGolpe] = useState(0);
  const [fiesta, setFiesta] = useState(0);
  const [llenar, setLlenar] = useState(false);

  const premios = PREMIOS_DEMO.map((p) => ({ ...p, canjeado: canjeados.includes(p.v) }));
  const pendientes = premios.filter((p) => p.v <= v && !p.canjeado);
  const sig = premios.find((p) => p.v > v);

  function escanear() {
    if (leyendo) return;
    setLeyendo(true); setRes(null);
    window.setTimeout(() => {
      setLeyendo(false);
      if (ultima !== null && ahora - ultima < ESPERA) { setRes({ tipo: "espera", proxima: ultima + ESPERA }); return; }
      const n = v + 1;
      setV(n); setUltima(ahora); setGolpe((g) => g + 1); setRes({ tipo: "ok", n });
      if (PREMIOS_DEMO.some((p) => p.v === n)) {
        setLlenar(true); setFiesta((f) => f + 1);
        window.setTimeout(() => setLlenar(false), 1000);
      }
    }, 700);
  }
  function entregar(p: { v: number; nombre: string }) {
    setCanjeados((c) => [...c, p.v]);
    setRes({ tipo: "canje", premio: p.nombre });
  }
  function reiniciar() {
    setV(INICIO); setAhora(HORA_INICIO); setUltima(null); setCanjeados(CANJEADOS_INICIO); setRes(null); setLlenar(false);
  }

  const pista = leyendo ? "Leyendo la tarjeta…"
    : !res ? (v === INICIO ? "Tocá «Escanear» para sumarle una visita a Lucía." : "Listo para escanear de nuevo.")
    : res.tipo === "espera" ? "Nadie suma de más: entre visita y visita hay 6 horas de espera (se ajusta para cada negocio)."
    : res.tipo === "canje" ? "Las visitas no se descuentan: Lucía sigue sumando para el próximo premio."
    : pendientes.length ? "¡Llegó al premio! Mirá su tarjeta y entregáselo."
    : "Ahora probá escanearla otra vez.";

  return (
    <div className="l-demo">
      <div className="l-esc">
        <div className="l-esc-top"><span><span className="l-punto" /> Tu celular · Escanear</span><span className="l-reloj">{dia(ahora)} · {hora(ahora)}</span></div>
        <div className={"l-cam" + (leyendo ? " leyendo" : "")} aria-hidden>
          <div className="l-cam-qr"><Qr texto="https://delacasa.com.ar/t/?demo=1" size={96} /></div>
          <div className="l-cam-marco"><i /><i /><i /><i /></div>
          <div className="l-cam-linea" />
        </div>
        <div aria-live="polite"><div key={JSON.stringify(res)} className={"l-res" + (!res ? " vacio" : res.tipo === "espera" ? " r-warn" : res.tipo === "ok" && pendientes.length ? " r-prize" : " r-good")}>
          {!res ? <p className="l-res-vacio">{leyendo ? "Leyendo…" : "Apuntá al QR de la tarjeta del cliente"}</p>
            : res.tipo === "espera" ? <>
                <span className="who">Lucía · socio #0042</span>
                <h3>Ya sumó una visita hace poco</h3>
                <p>Puede sumar otra desde las {hora(res.proxima)}. No se sumó nada.</p>
              </>
            : res.tipo === "canje" ? <>
                <span className="who">Lucía · socio #0042</span>
                <h3>Premio entregado: {res.premio}</h3>
                <p>{sig ? `Le ${sig.v - v === 1 ? "falta 1" : `faltan ${sig.v - v}`} para: ${sig.nombre}.` : "Ya llegó al premio máximo."}</p>
              </>
            : <>
                <span className="who">Lucía · socio #0042</span>
                <h3>Visita sumada: {res.n}</h3>
                {pendientes.length ? pendientes.map((p) => <p key={p.v}>¡Tiene un premio! <b>{p.nombre}</b> ({p.v} visitas)</p>)
                  : <p>{sig ? `Le ${sig.v - v === 1 ? "falta 1" : `faltan ${sig.v - v}`} para: ${sig.nombre}.` : "Ya llegó al premio máximo."}</p>}
              </>}
        </div></div>
        <div className="l-esc-btns">
          {res?.tipo === "ok" && pendientes.length > 0
            ? <button className="l-btn l-btn-amb" onClick={() => entregar(pendientes[0])}>Entregar premio</button>
            : <button className="l-btn l-btn-luz" onClick={escanear} disabled={leyendo}>{leyendo ? "Escaneando…" : "Escanear la tarjeta de Lucía"}</button>}
          {res?.tipo === "espera" && <button className="l-btn l-btn-borde" onClick={() => { setAhora((a) => a + ESPERA); setRes(null); }}>Adelantar el reloj 6 horas</button>}
        </div>
        <p className="l-pista">{pista}</p>
        {(v !== INICIO || res) && <button className="l-link-btn" onClick={reiniciar}>Empezar de nuevo</button>}
      </div>

      <div className={"l-flecha" + (res?.tipo === "ok" ? " pulso" : "")} key={golpe} aria-hidden><span /></div>

      <div className="l-demo-cli">
        <p className="l-demo-et">El celular de Lucía</p>
        <Telefono label={`Tarjeta de Lucía: ${v} visitas`}>
          <TarjetaCelu visitas={v} premios={premios} golpe={golpe} fiesta={fiesta} llenar={llenar} />
          <PremiosCelu visitas={v} premios={premios} />
        </Telefono>
      </div>
    </div>
  );
}
