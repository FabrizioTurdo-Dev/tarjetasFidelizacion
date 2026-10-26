"use client";
import { useEffect, useRef, useState } from "react";

// Panel del dueño con datos de ejemplo (las mismas secciones que /panel/). Los números cuentan hacia arriba
// y las barras crecen la primera vez que aparece en pantalla.
const DIAS = [12, 18, 15, 22, 9, 25, 31, 14, 19, 17, 26, 21, 28, 23];
const MAX = Math.max(...DIAS);
const TOP: [string, string, number][] = [["#0012", "Martín", 64], ["#0042", "Lucía", 51], ["#0007", "Sofía", 47]];
const CUMPLES: [string, string][] = [["Carla", "día 3"], ["Diego", "día 12"], ["Ana", "día 27"]];

export function PanelEjemplo() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [vivo, setVivo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setT(1); setVivo(true); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setVivo(true);
      const t0 = performance.now();
      const paso = (ahora: number) => {
        const p = Math.min(1, (ahora - t0) / 1500);
        setT(1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const n = (x: number) => Math.round(x * t);
  return (
    <div className={"l-panel" + (vivo ? " vivo" : "")} ref={ref} role="img" aria-label="Ejemplo del panel del negocio: 248 clientes con la tarjeta, visitas por día, premios entregados, clientes dormidos, top de clientes y cumpleaños del mes">
      <div className="l-panel-bar" aria-hidden><span className="l-dots"><i /><i /><i /></span><span className="l-url">delacasa.com.ar/panel</span><span className="l-ej">Ejemplo</span></div>
      <div className="l-panel-cuerpo" aria-hidden>
        <div className="l-panel-h"><b>Tu negocio</b><span>Cartel para el mostrador</span></div>
        <div className="l-panel-hero">
          <div><p><b>{n(248)}</b> clientes tienen tu tarjeta</p><small>{n(37)} se sumaron en los últimos 30 días</small></div>
          <span className="l-panel-btn">Escanear tarjeta</span>
        </div>
        <div className="l-panel-kpis">
          <div><b>{n(23)}</b><span>Visitas hoy</span></div>
          <div><b>{n(280)}</b><span>Visitas (14 días)</span></div>
          <div><b>{n(41)}</b><span>Premios entregados</span></div>
          <div className="alerta"><b>{n(19)}</b><span>Dormidos (+30 días)</span></div>
        </div>
        <div className="l-panel-box">
          <b>Visitas por día</b>
          <div className="l-panel-graf">{DIAS.map((d, i) => <i key={i} style={{ ["--h" as string]: `${(d / MAX) * 100}%`, ["--i" as string]: i }} />)}</div>
        </div>
        <div className="l-panel-2">
          <div className="l-panel-box"><b>Top de clientes</b>
            {TOP.map(([s, nom, vis]) => <div className="l-panel-fila" key={s}><span className="mono">{s}</span><span>{nom}</span><span className="mono">{vis}</span></div>)}
          </div>
          <div className="l-panel-box"><b>Cumpleaños del mes</b>
            {CUMPLES.map(([nom, d]) => <div className="l-panel-fila" key={nom}><span>🎂</span><span>{nom}</span><span className="muted">{d}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
