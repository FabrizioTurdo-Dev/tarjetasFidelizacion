"use client";
import { useState, type ReactNode } from "react";
import { Qr } from "@/components/Qr";
import { marca } from "@/lib/util";

// Maquetas de la página pública: el celular y la tarjeta del cliente, dibujados igual que /t/ pero en em,
// así se agrandan o achican con el font-size de .l-tel. Solo muestran lo que la tarjeta real hace.
// La tarjeta es la de De la Casa (el negocio interno, slug "delacasa"): mismo color y mismos premios.
// Si se cambian en Administración, actualizarlos acá.
export const COLOR_CASA = "#2f5d50";
export type PremioDemo = { v: number; nombre: string; canjeado?: boolean };
export const PREMIOS_DEMO: PremioDemo[] = [
  { v: 1, nombre: "Ya sos socio. Así lo ven tus clientes." },
  { v: 2, nombre: "30 días de prueba gratis" },
  { v: 7, nombre: "Charlemos sobre tu idea" },
];

export const Casa = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden><path fill="currentColor" d="M2.5 11.3 12 3.6l9.5 7.7V20a1.2 1.2 0 0 1-1.2 1.2h-5.5v-6.4H9.2v6.4H3.7A1.2 1.2 0 0 1 2.5 20z" /></svg>
);

export function Telefono({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div className={"l-tel " + className} role="img" aria-label={label}>
      <div className="l-pant" style={marca(COLOR_CASA)}>
        <div className="l-sb" aria-hidden><span>9:41</span><span className="l-sb-i"><i /><i /><i /><b /></span></div>
        {children}
      </div>
    </div>
  );
}

/** La tarjeta de Lucía en De la Casa. `llenar` deja la barra completa un momento al llegar a un premio. */
export function TarjetaCelu({ visitas, premios = PREMIOS_DEMO, golpe = 0, fiesta = 0, llenar = false, qr = true }: {
  visitas: number; premios?: PremioDemo[]; golpe?: number; fiesta?: number; llenar?: boolean; qr?: boolean;
}) {
  const sig = premios.find((p) => p.v > visitas);
  const prev = [...premios].reverse().find((p) => p.v <= visitas);
  // Al llenar, la barra muestra el tramo que se acaba de completar.
  const tramoAnt = llenar && prev ? [...premios].reverse().find((p) => p.v < prev.v) : undefined;
  const desde = prev ? prev.v : 0;
  const pct = llenar ? 100 : sig ? Math.max(4, Math.round(((visitas - desde) / (sig.v - desde)) * 100)) : 100;
  // La barra se anima al subir; al volver a empezar un tramo, salta sin animación.
  const [antes, setAntes] = useState(pct);
  const [baja, setBaja] = useState(false);
  if (pct !== antes) { setAntes(pct); setBaja(pct < antes); }
  const falta = sig ? sig.v - visitas : 0;

  return (
    <div className="l-tj">
      <div className="l-tj-top">
        <div className="l-tj-biz"><span className="l-tj-logo"><Casa /></span><span><b>De la Casa</b><small>Hola, Lucía</small></span></div>
        <span className="l-tj-soc">Socio<b>#0042</b></span>
      </div>
      <div>
        <div className="l-tj-n"><b key={golpe} className={golpe ? "golpe" : undefined}>{visitas}</b> <small>{visitas === 1 ? "visita" : "visitas"}</small></div>
        <p className="l-tj-falta">{sig ? `Te ${falta === 1 ? "falta 1 visita" : `faltan ${falta} visitas`} para: ${sig.nombre}` : "¡Llegaste al premio máximo!"}</p>
      </div>
      <div>
        <div className="l-tj-bar"><i className={baja ? "salto" : undefined} style={{ width: pct + "%" }} /></div>
        <div className="l-tj-bl">
          <span>{llenar ? (tramoAnt ? tramoAnt.v + " ✓" : "0") : prev ? prev.v + " ✓" : "0"}</span>
          <span>{llenar && prev ? prev.v + " ✓" : sig?.v}</span>
        </div>
      </div>
      {qr && <div className="l-tj-qr"><Qr texto="https://delacasa.com.ar/" size={84} /><span>Mostralo al pagar o decí tu número de socio</span></div>}
      {fiesta > 0 && <Confeti key={fiesta} />}
    </div>
  );
}

export function PremiosCelu({ visitas, premios = PREMIOS_DEMO }: { visitas: number; premios?: PremioDemo[] }) {
  const sig = premios.find((p) => p.v > visitas);
  return (
    <div className="l-tp">
      <b>Premios</b>
      {premios.map((p) => (
        <div className="l-tp-r" key={p.v}>
          <span className={p.v <= visitas ? "gan" : undefined}>{p.nombre}</span>
          {p.canjeado ? <i className="chip c-neutral">Ya lo canjeaste</i>
            : p.v <= visitas ? <i className="chip c-good nuevo">¡Ya lo ganaste!</i>
            : <i className="chip c-neutral">{p.v} visitas{p === sig ? ` · faltan ${p.v - visitas}` : ""}</i>}
        </div>
      ))}
    </div>
  );
}

const COLORES = ["#f2b544", "#fff7f2", "#e9876b", "#8fc79a"];
function Confeti() {
  return (
    <span className="l-confeti" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const d = 5 + (i % 3) * 1.6;
        return <i key={i} style={{ ["--x" as string]: `${(Math.cos(a) * d).toFixed(2)}em`, ["--y" as string]: `${(Math.sin(a) * d * 0.8 - 1.5).toFixed(2)}em`,
          ["--r" as string]: `${i * 47}deg`, ["--c" as string]: COLORES[i % 4] }} />;
      })}
    </span>
  );
}
