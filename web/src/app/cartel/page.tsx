"use client";
import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { Qr } from "@/components/Qr";
import { BASE, iniciales, tinta } from "@/lib/util";

type Pub = { nombre: string; color: string; operativo: boolean };
type P = { visitas: number; nombre: string };

// Vista demo (/cartel/?demo=1): el QR abre la tarjeta de ejemplo, así se puede mostrar sin crear socios de verdad.
const DEMO: Pub = { nombre: "Almadekh", color: "#7a3e2b", operativo: true };
const DEMO_PREMIOS: P[] = [{ visitas: 5, nombre: "Café de cortesía" }, { visitas: 10, nombre: "Postre gratis" }, { visitas: 100, nombre: "Cena para dos" }];

/** Cartel A4 para el mostrador: QR de alta y cómo hacerse socio. Siempre en papel blanco, también en modo oscuro. */
function Cartel() {
  const q = useSearchParams();
  const demo = q.has("demo");
  const slug = q.get("n") || "";
  const [neg, setNeg] = useState<Pub | null>(null);
  const [cargado, setCargado] = useState(false);
  const [premios, setPremios] = useState<P[]>([]);
  const [conPremios, setConPremios] = useState(true);

  useEffect(() => {
    if (demo) { setNeg(DEMO); setPremios(DEMO_PREMIOS); setCargado(true); return; }
    if (!slug) return;
    sb.rpc("negocio_publico", { p_slug: slug }).then(({ data }) => { setNeg((data as Pub) ?? null); setCargado(true); });
    // Los premios solo se leen con sesión (superadmin o usuarios del negocio). Sin sesión, el cartel sale sin ellos.
    (async () => {
      if (!(await sb.auth.getSession()).data.session) return;
      const { data: n } = await sb.from("negocios").select("id").eq("slug", slug).maybeSingle();
      if (!n) return;
      const { data } = await sb.from("premios").select("visitas,nombre").eq("negocio_id", n.id).eq("activo", true).order("visitas");
      setPremios((data as P[]) ?? []);
    })();
  }, [slug, demo]);

  if (!slug && !demo) return <main className="screen"><h1>Falta el negocio</h1><p className="muted">Abrí el cartel desde Administración o desde el panel del negocio.</p></main>;
  if (!cargado) return <main className="screen"><p className="muted">Cargando…</p></main>;
  if (!neg) return <main className="screen"><h1>No encontramos ese negocio</h1><p className="muted">Revisá la dirección del QR (slug) en Administración.</p></main>;

  const url = demo ? `${location.origin}${BASE}/t/?demo=1` : `${location.origin}${BASE}/alta/?n=${slug}`;
  const ink = tinta(neg.color);
  const estilo = {
    ["--marca" as string]: neg.color,
    ["--marca-ink" as string]: ink,
    // Con un color de marca muy claro, los títulos van en negro para que se lean sobre el papel.
    ["--acento" as string]: ink === "#1c1a19" ? "#1c1a19" : neg.color,
  } as CSSProperties;
  const visibles = conPremios ? premios.slice(0, 4) : [];

  return (
    <main className="cartel-pag">
      <div className="noprint cartel-barra">
        <button className="btn ghost sm" onClick={() => history.back()}>← Volver</button>
        <button className="btn dark sm" onClick={() => window.print()}>Imprimir</button>
        {premios.length > 0 && <label className="check"><input type="checkbox" checked={conPremios} onChange={(e) => setConPremios(e.target.checked)} />Mostrar los premios</label>}
      </div>
      <p className="noprint small muted">Sale en una hoja A4. En la ventana de impresión, si aparece, elegí márgenes «Ninguno» y activá «Gráficos de fondo».
        {premios.length > 4 && " Entran hasta 4 premios: se muestran los primeros."}
        {!premios.length && !demo && " Para que figuren los premios, abrilo con tu sesión iniciada (desde Administración o el panel)."}</p>
      {!neg.operativo && <div className="aviso noprint">Ojo: este negocio no está tomando socios ahora (prueba vencida o cuenta suspendida). El QR va a avisar eso.</div>}

      <article className="cartel" style={estilo} aria-label="Cartel para imprimir">
        <div>
          <header className="c-biz"><div className="c-logo">{iniciales(neg.nombre)}</div><span>{neg.nombre}</span></header>
          <div>
            <h1>Sumá visitas<br />y ganá premios</h1>
            <p className="c-sub">Tu tarjeta de cliente en el celular. Sin descargar nada.</p>
          </div>
          <div className="c-qr"><Qr texto={url} size={400} /></div>
          <ol className="c-pasos">
            <li>Escaneá el código con la cámara del celular</li>
            <li>Completá tu nombre y tu teléfono</li>
            <li>Mostrá tu tarjeta cada vez que vengas</li>
          </ol>
          {visibles.length > 0 && (
            <section className="c-premios"><h2>Premios</h2>
              <div>{visibles.map((p) => <span key={p.visitas}><b>{p.visitas}<small> visitas</small></b>{p.nombre}</span>)}</div>
            </section>
          )}
          <footer>Funciona con De la Casa</footer>
        </div>
      </article>
    </main>
  );
}

export default function Page() { return <Suspense><Cartel /></Suspense>; }
