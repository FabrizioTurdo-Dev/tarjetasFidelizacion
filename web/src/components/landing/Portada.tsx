"use client";
import { useEffect, useState } from "react";
import { PremiosCelu, TarjetaCelu, Telefono } from "./Tarjeta";

// Celular de la portada: la tarjeta de De la Casa. El negocio escanea dos veces, a Lucía se le suman
// las visitas y gana los 30 días de prueba. Se repite solo. Con "reducir movimiento" queda quieto en el premio.
export function Portada() {
  const [v, setV] = useState(0);
  const [aviso, setAviso] = useState({ n: 1, premio: "" });
  const [ver, setVer] = useState(false);
  const [golpe, setGolpe] = useState(0);
  const [fiesta, setFiesta] = useState(0);
  const [llenar, setLlenar] = useState(false);
  const [fundido, setFundido] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(2); return; }
    let vivo = true;
    const ts: number[] = [];
    const en = (ms: number, f: () => void) => { ts.push(window.setTimeout(() => vivo && f(), ms)); };
    // Las dos visitas llegan a un premio: la barra se llena; el confeti, solo para la prueba gratis.
    const sumar = (n: number, confeti: boolean) => {
      setV(n); setGolpe((g) => g + 1); setLlenar(true);
      if (confeti) setFiesta((f) => f + 1);
      en(1000, () => setLlenar(false));
    };
    function ciclo() {
      ts.length = 0;
      setV(0); setFundido(false); setVer(false);
      en(1300, () => { setAviso({ n: 1, premio: "" }); setVer(true); });
      en(1800, () => sumar(1, false));
      en(3900, () => setVer(false));
      en(4500, () => { setAviso({ n: 2, premio: "30 días de prueba gratis" }); setVer(true); });
      en(5000, () => sumar(2, true));
      en(9000, () => setVer(false));
      en(9600, () => setFundido(true));
      en(10100, ciclo);
    }
    ciclo();
    return () => { vivo = false; ts.forEach(clearTimeout); };
  }, []);

  return (
    <div className="l-portada">
      <Telefono label="La tarjeta de De la Casa en el celular de una clienta, sumando visitas hasta ganar 30 días de prueba gratis" className={fundido ? "l-fundido" : ""}>
        <TarjetaCelu visitas={v} golpe={golpe} fiesta={fiesta} llenar={llenar} />
        <PremiosCelu visitas={v} />
      </Telefono>
      <div className={"l-aviso" + (ver ? " on" : "") + (aviso.premio ? " premio" : "")} aria-hidden>
        <small><span className="l-punto" /> Tu celular · Escanear</small>
        <b>Visita sumada: {aviso.n}</b>
        <span>{aviso.premio ? <>¡Tiene un premio! <strong>{aviso.premio}</strong></> : "Lucía · socio #0042"}</span>
      </div>
      <span className="l-flota" aria-hidden>Sin bajar ninguna app</span>
    </div>
  );
}
