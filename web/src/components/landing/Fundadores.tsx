"use client";
import { useEffect, useState } from "react";
import { CUPO_FUNDADORES as CUPO, PRECIO, PRECIO_FUNDADOR } from "@/lib/precios";
import { rpcPublica } from "@/lib/rpc";

// Socios fundadores: los primeros 10 negocios que llegan por el formulario de la página y Fabri habilita.
// La base cuenta los lugares (lugares_fundadores, migración 0007). Mientras no llega el número se muestra
// la promo sin contador; cuando no quedan lugares, todo lo de fundadores desaparece de la página.

// Una sola consulta para todos los componentes de la página.
let pedido: Promise<number | null> | null = null;
function consultar() {
  pedido ??= rpcPublica("lugares_fundadores").then(({ data, error }) => (error || typeof data !== "number" ? null : data), () => null);
  return pedido;
}

/** Lugares libres (0 a 10), o null mientras carga o si falló la consulta. */
export function useLugares() {
  const [lugares, setLugares] = useState<number | null>(null);
  useEffect(() => { consultar().then(setLugares); }, []);
  return lugares;
}

const quedan = (n: number) => (n === 1 ? "Queda 1 lugar" : `Quedan ${n} lugares`);

/** La insignia de arriba de la portada. */
export function InsigniaFundadores() {
  const lugares = useLugares();
  if (lugares === 0) return null;
  return (
    <a href="#precios" className="l-insignia l-entra" style={{ ["--d" as string]: 0 }}>
      <b>Socios fundadores</b> {lugares === null ? `Los primeros ${CUPO} negocios pagan la mitad` : `${quedan(lugares)}: pagan la mitad`} <span aria-hidden>→</span>
    </a>
  );
}

/** La tarjeta de precio de fundador: los lugares ocupados se tachan. */
export function PlanFundador() {
  const lugares = useLugares();
  if (lugares === 0) return null;
  const ocupados = lugares === null ? 0 : CUPO - lugares;
  return (
    <div className="l-plan l-fund rv" style={{ ["--d" as string]: 1 }}>
      <span className="l-fund-tag">{lugares === null ? `Solo ${CUPO} lugares` : quedan(lugares)}</span>
      <p className="l-plan-n">Socio fundador</p>
      <p className="l-plan-p"><b>{PRECIO_FUNDADOR}</b> <span>por mes</span></p>
      <p className="l-plan-sub">Durante 6 meses. Después, {PRECIO} por mes.</p>
      <p className="l-fund-txt">Para los primeros {CUPO} negocios que se suman desde esta página.</p>
      <ol className="l-fund-lugares" aria-label={lugares === null ? `${CUPO} lugares` : `${ocupados} de ${CUPO} lugares ocupados`}>
        {Array.from({ length: CUPO }, (_, i) => (
          <li key={i} className={i < ocupados ? "tomado" : undefined} style={{ ["--i" as string]: i }}>{i + 1}</li>
        ))}
      </ol>
      <ul className="l-incluye">
        <li>Todo lo del plan, sin diferencias</li>
        <li>Mitad de precio durante 6 meses</li>
        <li>Antes, los 30 días de prueba gratis</li>
      </ul>
      <a href="#probar" className="l-btn l-btn-amb">Quiero ser socio fundador</a>
    </div>
  );
}

const CLAVE = "dlc_fundadores_cerrado";

/** Barra flotante de abajo. En el celular lleva el botón "Probalo gratis" (el del encabezado queda lejos cuando
 *  la página es larga) y, mientras queden lugares, el aviso de socios fundadores. En pantallas anchas es solo
 *  el aviso, porque el botón ya está en el encabezado fijo. Aparece después de la portada y se esconde en la demo,
 *  en precios y en el formulario. */
export function PildoraFundadores() {
  const lugares = useLugares();
  const [ver, setVer] = useState(false);
  const [cerrada, setCerrada] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(CLAVE)) setCerrada(true); } catch { /* sin almacenamiento: se muestra igual */ }
    const tapan = new Set<Element>();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? tapan.add(e.target) : tapan.delete(e.target)));
      setVer(tapan.size === 0);
    });
    document.querySelectorAll(".l-hero, #demo, #precios, #probar").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function cerrar() {
    setCerrada(true);
    try { sessionStorage.setItem(CLAVE, "1"); } catch { /* nada */ }
  }

  const aviso = lugares !== 0 && !cerrada;
  return (
    <div className={"l-barra" + (ver ? " on" : "") + (aviso ? "" : " l-solo-angosto")} inert={!ver}>
      {aviso ? (
        <a href="#precios" className="l-barra-aviso">
          <b>50%</b>
          <span><strong>Socios fundadores</strong>
            <small>{lugares !== null && `${quedan(lugares)} · `}{PRECIO_FUNDADOR} por mes<span className="l-solo-ancho"> durante 6 meses</span></small></span>
        </a>
      ) : (
        <span className="l-barra-aviso"><span><strong>30 días gratis</strong><small>Sin tarjeta de crédito</small></span></span>
      )}
      <a href="#probar" className="l-btn l-btn-amb l-btn-chico l-solo-angosto">Probalo gratis</a>
      {aviso && <button onClick={cerrar} aria-label="Cerrar aviso de socios fundadores">×</button>}
    </div>
  );
}
