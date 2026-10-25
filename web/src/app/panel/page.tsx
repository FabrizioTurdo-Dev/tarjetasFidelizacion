"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/Auth";
import { EditorPremios, type PremioEd } from "@/components/EditorPremios";
import { EditorInfo, infoDeNegocio } from "@/components/Info";
import { Firma, linkWhatsapp } from "@/components/Firma";
import { BotonInstalar } from "@/components/Instalar";
import { sb } from "@/lib/supabase";
import { negociosDelUsuario, type NegocioUsuario } from "@/lib/negocios";
import { BASE, marca, socio, type Negocio } from "@/lib/util";

type Cli = { token: string; id: string; numero_socio: number; nombre: string; telefono: string | null; email: string | null; cumple: string | null; visitas: number; ultima_visita: string | null; created_at: string; resena_abierta_at: string | null };
const DIA = 864e5;

// Vista demo (/panel/?demo=1): un negocio de ejemplo con actividad, sin login ni base de datos.
function datosDemo() {
  const nombres = ["Lucía", "Martín", "Sofía", "Carla", "Pablo", "Julieta", "Tomás", "Valentina", "Nicolás", "Camila", "Diego", "Agustina", "Matías", "Florencia", "Franco", "Micaela", "Lautaro", "Rocío", "Bruno", "Paula", "Joaquín", "Mariana", "Ezequiel", "Daniela"];
  const mes = new Date().getMonth();
  const clientes: Cli[] = nombres.map((nombre, i) => {
    const dias = i < 17 ? Math.floor((i * 7) % 28) : 35 + i * 3; // los últimos quedan "dormidos"
    return {
      id: "c" + i, token: "demo", numero_socio: i + 1, nombre,
      telefono: "11 5" + String(1000000 + i * 37911).slice(0, 7), email: null,
      cumple: i % 6 === 0 ? `1990-${String(mes + 1).padStart(2, "0")}-${String(3 + i).padStart(2, "0")}` : null,
      visitas: Math.max(1, 23 - i), ultima_visita: new Date(Date.now() - dias * DIA).toISOString(),
      created_at: new Date(Date.now() - (50 - i * 2) * DIA).toISOString(),
      resena_abierta_at: i % 3 === 0 ? new Date(Date.now() - i * DIA).toISOString() : null,
    };
  });
  const visitas = Array.from({ length: 96 }, (_, i) => ({ created_at: new Date(Date.now() - ((i * 5) % 14) * DIA - (i % 5) * 36e5).toISOString() }));
  const negocio: Negocio = { id: "demo", slug: "almadekh", nombre: "Almadekh", rubro: "Restaurante", color: "#7a3e2b", espera_horas: 6, vence_dias: 60, estado: "prueba", inicio_prueba: new Date(Date.now() - 12 * DIA).toISOString().slice(0, 10), resenas_url: "https://g.page/r/ejemplo/review" };
  const premios: PremioEd[] = [{ id: "a", visitas: 5, nombre: "Café de cortesía", activo: true }, { id: "b", visitas: 10, nombre: "Postre gratis", activo: true }, { id: "c", visitas: 100, nombre: "Cena para dos", activo: true }];
  return { negocio, clientes, visitas, canjes: 9, premios };
}

function Panel({ uid, demo = false }: { uid: string; demo?: boolean }) {
  const router = useRouter();
  const [negocios, setNegocios] = useState<NegocioUsuario[]>([]);
  const [negId, setNegId] = useState("");
  const [esSuper, setEsSuper] = useState(false);
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [total, setTotal] = useState(0);
  const [premios, setPremios] = useState<PremioEd[]>([]);
  const [visitas, setVisitas] = useState<{ created_at: string }[]>([]);
  const [canjes, setCanjes] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [cargoNegocios, setCargoNegocios] = useState(false);
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    if (demo) { const d = datosDemo(); setNegocios([d.negocio]); setNegId("demo"); setClientes(d.clientes); setTotal(d.clientes.length); setVisitas(d.visitas); setCanjes(d.canjes); setPremios(d.premios); setCargoNegocios(true); return; }
    const forzado = new URLSearchParams(location.search).get("n");
    sb.from("perfiles").select("es_superadmin").eq("id", uid).maybeSingle().then(({ data }) => setEsSuper(!!data?.es_superadmin));
    negociosDelUsuario(uid, forzado).then((l) => {
      // Un empleado no ve el panel (la lista de clientes es del dueño): va directo a escanear.
      if (l.length && l.every((n) => n.rol === "empleado")) { router.replace("/escanear/"); return; }
      setNegocios(l); if (l[0]) setNegId(l[0].id); setCargoNegocios(true);
    });
  }, [uid, demo, router]);

  useEffect(() => {
    if (!negId || demo) return;
    setCargando(true);
    const desde = new Date(Date.now() - 14 * DIA).toISOString();
    Promise.all([
      sb.from("clientes").select("token,id,numero_socio,nombre,telefono,email,cumple,visitas,ultima_visita,created_at,resena_abierta_at").eq("negocio_id", negId).order("numero_socio").limit(5000),
      sb.from("visitas").select("created_at").eq("negocio_id", negId).gte("created_at", desde).limit(5000),
      sb.from("canjes").select("id", { count: "exact", head: true }).eq("negocio_id", negId),
      sb.from("clientes").select("id", { count: "exact", head: true }).eq("negocio_id", negId),
      sb.from("premios").select("id,visitas,nombre,activo").eq("negocio_id", negId).is("archivado_at", null).order("visitas"),
    ]).then(([c, v, k, t, p]) => {
      setClientes((c.data as Cli[]) ?? []); setVisitas((v.data as { created_at: string }[]) ?? []); setCanjes(k.count ?? 0);
      setTotal(t.count ?? 0); setPremios((p.data as PremioEd[]) ?? []);
      setCargando(false);
    });
  }, [negId, demo]);

  const neg = negocios.find((n) => n.id === negId);

  // Comparte el link de la tarjeta (hoja de compartir del celular) o, si no hay, lo copia.
  async function reenviar(c: Cli) {
    const url = `${location.origin}${BASE}/t/?k=${c.token}`;
    const texto = `Hola ${c.nombre}, esta es tu tarjeta de ${neg?.nombre}. Guardala en tu celular: ${url}`;
    try {
      if (navigator.share) { await navigator.share({ text: texto }); return; }
      await navigator.clipboard.writeText(texto);
      setCopiado(c.id); setTimeout(() => setCopiado(""), 2000);
    } catch { /* el usuario canceló */ }
  }
  const ahora = Date.now();
  const venceMs = (neg?.vence_dias ?? 60) * DIA;
  // El contador solo vale mientras la tarjeta no esté vencida.
  const vigentes = (c: Cli) => (c.ultima_visita && ahora - new Date(c.ultima_visita).getTime() <= venceMs ? c.visitas : 0);
  const dormidos = clientes.filter((c) => !c.ultima_visita || ahora - new Date(c.ultima_visita).getTime() > 30 * DIA);
  const nuevos = clientes.filter((c) => ahora - new Date(c.created_at).getTime() <= 30 * DIA).length;
  const top = [...clientes].sort((a, b) => vigentes(b) - vigentes(a)).slice(0, 10);
  const mes = new Date().getMonth();
  const cumples = clientes.filter((c) => c.cumple && new Date(c.cumple + "T00:00:00").getMonth() === mes)
    .sort((a, b) => new Date(a.cumple! + "T00:00:00").getDate() - new Date(b.cumple! + "T00:00:00").getDate());
  const porDia = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(ahora - (13 - i) * DIA);
    const key = d.toDateString();
    return { d, n: visitas.filter((v) => new Date(v.created_at).toDateString() === key).length };
  });
  const maxDia = Math.max(1, ...porDia.map((x) => x.n));
  const resenas = clientes.filter((c) => c.resena_abierta_at).length;
  const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-AR") : "—");

  if (!cargoNegocios) return <p className="muted">Cargando…</p>;
  if (!negocios.length) return <div className="aviso">Tu usuario todavía no está vinculado a un negocio. Pedile el alta a quien te dio el acceso.</div>;
  return (
    <>
      {negocios.length > 1 && <select value={negId} onChange={(e) => setNegId(e.target.value)}>{negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>}
      <div className="top" style={{ flexWrap: "wrap" }}>
        <h1>{neg?.nombre}</h1>
        <div className="links">
          <Link href="/guia/">Cómo se usa</Link>
          {neg && <Link href={demo ? "/cartel/?demo=1" : `/cartel/?n=${neg.slug}`}>Cartel para el mostrador</Link>}
          {neg && <a href={linkWhatsapp(`¡Hola, Fabrizio! Te escribo desde ${neg.nombre} por De la Casa: `)} target="_blank" rel="noopener noreferrer">Escribinos</a>}
          {esSuper && <Link href="/admin/">Administración</Link>}
        </div>
      </div>
      {cargando && <p className="muted">Cargando…</p>}
      <section className="hero">
        <div>
          <p><b>{total}</b> {total === 1 ? "cliente tiene" : "clientes tienen"} tu tarjeta</p>
          <p className="small muted">{nuevos ? `${nuevos} ${nuevos === 1 ? "se sumó" : "se sumaron"} en los últimos 30 días` : "Todavía nadie nuevo en los últimos 30 días"}</p>
        </div>
        <Link className="btn" href="/escanear/" style={neg ? marca(neg.color) : undefined}>Escanear tarjeta</Link>
      </section>
      <BotonInstalar texto="Instalar De la Casa en este celular" className="btn ghost" />
      <div className="kpis">
        <div className="kpi"><b>{porDia[13].n}</b><span>Visitas hoy</span></div>
        <div className="kpi"><b>{visitas.length}</b><span>Visitas (14 días)</span></div>
        <div className="kpi"><b>{canjes}</b><span>Premios entregados</span></div>
        <div className="kpi"><b>{dormidos.length}</b><span>Dormidos (+30 días)</span></div>
      </div>

      <section className="box"><h2>Visitas por día</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90 }}>
          {porDia.map((x, i) => <div key={i} title={`${x.d.toLocaleDateString("es-AR")}: ${x.n}`} style={{ flex: 1, background: "var(--ink)", opacity: .8, borderRadius: 3, height: Math.max(3, (x.n / maxDia) * 90) }} />)}
        </div>
        <div className="bar-l muted" style={{ opacity: 1 }}><span>{porDia[0].d.toLocaleDateString("es-AR")}</span><span>hoy</span></div>
      </section>

      <section className="box"><h2>Reseñas en Google</h2>
        {neg?.resenas_url ? (<>
          <p><b>{resenas}</b> {resenas === 1 ? "cliente tocó" : "clientes tocaron"} «Dejar mi reseña» desde su tarjeta.</p>
          <p className="small muted">La tarjeta se lo ofrece a cada cliente desde su 2ª visita, una sola vez. Google no nos avisa si la publicaron: las reseñas las ves en tu ficha de Google.</p>
        </>) : <p className="small muted">Tu tarjeta puede invitar a tus clientes a dejar una reseña en Google desde su 2ª visita. Para activarlo, pasanos por WhatsApp el link de <b>Pedir reseñas</b> de tu Perfil de Empresa de Google.</p>}
      </section>

      <section className="box"><h2>Top 10 de clientes</h2>
        <table><thead><tr><th>Socio</th><th>Nombre</th><th>Visitas</th></tr></thead>
          <tbody>{top.map((c) => <tr key={c.id}><td>{socio(c.numero_socio)}</td><td>{c.nombre}</td><td>{vigentes(c)}</td></tr>)}</tbody></table>
      </section>

      <section className="box"><h2>Tus premios</h2>
        {neg?.rol === "dueno" || esSuper || demo
          ? <EditorPremios negocioId={negId} inicial={premios} visitasClientes={clientes.map(vigentes)} demo={demo} onGuardado={setPremios} />
          : <div>{premios.filter((p) => p.activo).map((p) => (
              <div className="pr" key={p.id}><span>{p.nombre}</span><span className="chip c-neutral">{p.visitas} visitas</span></div>))}</div>}
      </section>

      {neg && (neg.rol === "dueno" || esSuper || demo) &&
        <section className="box"><h2>Información en la tarjeta</h2>
            <EditorInfo key={negId} negocioId={negId} inicial={infoDeNegocio(neg)} demo={demo}
              onGuardado={(i) => setNegocios((l) => l.map((n) => (n.id === negId ? { ...n, info_titulo: i.titulo, info_texto: i.texto, info_links: i.links } : n)))} />
        </section>}

      <section className="box"><h2>Cumpleaños del mes</h2>
        {cumples.length ? <table><tbody>{cumples.map((c) => <tr key={c.id}><td>{c.nombre}</td><td>{new Date(c.cumple! + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</td></tr>)}</tbody></table> : <p className="muted small">Nadie cumple este mes (o no cargaron la fecha).</p>}
      </section>

      <section className="box"><h2>Todos los clientes</h2>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Socio</th><th>Nombre</th><th>Contacto</th><th>Visitas</th><th>Última visita</th><th>Tarjeta</th></tr></thead>
          <tbody>{clientes.map((c) => <tr key={c.id}><td>{socio(c.numero_socio)}</td><td>{c.nombre}</td><td>{c.telefono || c.email}</td><td>{vigentes(c)}</td><td>{fecha(c.ultima_visita)}</td>
            <td><button className="x" style={{ padding: "4px 10px", whiteSpace: "nowrap" }} onClick={() => reenviar(c)}>{copiado === c.id ? "¡Copiado!" : "Reenviar link"}</button></td></tr>)}</tbody></table></div>
        <p className="small muted">Si un cliente perdió su tarjeta, tocá "Reenviar link" y mandáselo por WhatsApp: con ese link recupera sus visitas.</p>
      </section>
    </>
  );
}

export default function Page() {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(new URLSearchParams(location.search).has("demo")), []);
  return (
    <main className="screen wide">
      {demo
        ? (<><div className="aviso">Vista demo con datos de ejemplo: así vería el panel un negocio con actividad.</div><Panel uid="" demo /></>)
        : <RequireAuth>{(s) => <Panel uid={s.user.id} />}</RequireAuth>}
      <Firma mensaje="¡Hola, Fabrizio! Te escribo por De la Casa, tengo una consulta." />
    </main>
  );
}
