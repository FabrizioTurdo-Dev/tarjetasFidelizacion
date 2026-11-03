"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { BASE, iniciales, marca, msg } from "@/lib/util";
import { Firma, linkWhatsapp } from "@/components/Firma";

type Pub = { nombre: string; color: string; operativo: boolean };

/** Límite de altas (migración 0009): cuenta regresiva hasta poder anotarse y WhatsApp de Fabri por si no puede esperar. */
function Espera({ hasta, negocio, onFin }: { hasta: number | null; negocio: string; onFin: () => void }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (!hasta) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasta]);
  const faltan = hasta ? Math.max(0, Math.ceil((hasta - ahora) / 1000)) : null;
  useEffect(() => { if (faltan === 0) onFin(); }, [faltan, onFin]);
  const reloj = faltan === null ? "" : `${Math.floor(faltan / 60)}:${String(faltan % 60).padStart(2, "0")}`;
  return (
    <>
      {faltan !== null && <p className="small" style={{ margin: "6px 0 0" }}>Vas a poder anotarte en <b className="mono">{reloj}</b>.</p>}
      <p className="small" style={{ margin: "6px 0 0" }}>¿No podés esperar? <a href={linkWhatsapp(`¡Hola! Quiero anotarme en la tarjeta de ${negocio} y me pide que espere.`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a> y lo resolvemos.</p>
    </>
  );
}

function Alta() {
  const slug = useSearchParams().get("n") || "";
  const router = useRouter();
  const [neg, setNeg] = useState<Pub | null>(null);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [cumple, setCumple] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [err, setErr] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState<{ hasta: number | null } | null>(null);
  const finEspera = useCallback(() => { setEspera(null); setErr(""); }, []);

  useEffect(() => {
    if (!slug) return;
    sb.rpc("negocio_publico", { p_slug: slug }).then(({ data }) => { if (data) setNeg(data as Pub); });
  }, [slug]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setEspera(null); setOcupado(true);
    const c = contacto.trim();
    const esMail = c.includes("@");
    const { data, error } = await sb.rpc("alta_cliente", {
      p_slug: slug, p_nombre: nombre, p_telefono: esMail ? null : c, p_email: esMail ? c : null,
      p_cumple: cumple || null, p_acepta: acepta,
    });
    setOcupado(false);
    if (error) {
      if (error.message.includes("demasiadas_altas")) {
        const seg = Number(error.details);
        setEspera({ hasta: seg > 0 ? Date.now() + seg * 1000 : null });
      }
      setErr(msg(error)); return;
    }
    router.push(`/t/?k=${data}&nueva=1`);
  }

  if (!slug) return <main className="screen"><h1>Falta el negocio</h1><p className="muted">Escaneá el QR que está en el mostrador.</p></main>;

  return (
    <main className="screen" style={neg ? marca(neg.color) : undefined}>
      <div className="biz">
        <div className="logo">{iniciales(neg?.nombre || slug)}</div>
        <div><h1 style={{ fontSize: 22 }}>{neg?.nombre || "Tu tarjeta de cliente"}</h1><p className="muted small">Sumá visitas y ganá premios</p></div>
      </div>
      {neg && !neg.operativo && <div className="aviso">Este negocio no está tomando socios nuevos por ahora.</div>}
      <form className="box" onSubmit={enviar}>
        <label>Nombre<input required maxLength={80} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        <label>Teléfono o mail<input required maxLength={120} autoComplete="tel" value={contacto} onChange={(e) => setContacto(e.target.value)} /></label>
        <label>Cumpleaños (opcional)<input type="date" value={cumple} onChange={(e) => setCumple(e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>Acepto que {neg?.nombre || "el negocio"} guarde mis datos para manejar mi tarjeta y avisarme de premios. Puedo pedir que los borren cuando quiera. <a href={`${BASE}/privacidad/`} target="_blank" rel="noopener">Leer la política de privacidad</a>.</span></label>
        {err && <div className="errmsg">{err}{espera && <Espera hasta={espera.hasta} negocio={neg?.nombre || slug} onFin={finEspera} />}</div>}
        <button className="btn" disabled={ocupado || !acepta || !!espera?.hasta}>Crear mi tarjeta</button>
      </form>
      <Firma />
    </main>
  );
}

export default function Page() { return <Suspense><Alta /></Suspense>; }
