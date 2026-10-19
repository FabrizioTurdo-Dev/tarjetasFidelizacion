"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/Auth";
import { sb } from "@/lib/supabase";
import { negociosDelUsuario } from "@/lib/negocios";
import { socio, type Negocio } from "@/lib/util";

type Cli = { id: string; numero_socio: number; nombre: string; telefono: string | null; email: string | null; cumple: string | null; visitas: number; ultima_visita: string | null; created_at: string };
const DIA = 864e5;

// Vista demo (/panel/?demo=1): un negocio de ejemplo con actividad, sin login ni base de datos.
function datosDemo() {
  const nombres = ["Lucía", "Martín", "Sofía", "Carla", "Pablo", "Julieta", "Tomás", "Valentina", "Nicolás", "Camila", "Diego", "Agustina", "Matías", "Florencia", "Franco", "Micaela", "Lautaro", "Rocío", "Bruno", "Paula", "Joaquín", "Mariana", "Ezequiel", "Daniela"];
  const mes = new Date().getMonth();
  const clientes: Cli[] = nombres.map((nombre, i) => {
    const dias = i < 17 ? Math.floor((i * 7) % 28) : 35 + i * 3; // los últimos quedan "dormidos"
    return {
      id: "c" + i, numero_socio: i + 1, nombre,
      telefono: "11 5" + String(1000000 + i * 37911).slice(0, 7), email: null,
      cumple: i % 6 === 0 ? `1990-${String(mes + 1).padStart(2, "0")}-${String(3 + i).padStart(2, "0")}` : null,
      visitas: Math.max(1, 23 - i), ultima_visita: new Date(Date.now() - dias * DIA).toISOString(),
      created_at: new Date(Date.now() - (60 - i) * DIA).toISOString(),
    };
  });
  const visitas = Array.from({ length: 96 }, (_, i) => ({ created_at: new Date(Date.now() - ((i * 5) % 14) * DIA - (i % 5) * 36e5).toISOString() }));
  const negocio: Negocio = { id: "demo", slug: "almadekh", nombre: "Almadekh", rubro: "Restaurante", color: "#7a3e2b", espera_horas: 6, vence_dias: 60, estado: "prueba", inicio_prueba: new Date(Date.now() - 12 * DIA).toISOString().slice(0, 10) };
  return { negocio, clientes, visitas, canjes: 9 };
}

function Panel({ uid, demo = false }: { uid: string; demo?: boolean }) {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [negId, setNegId] = useState("");
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [visitas, setVisitas] = useState<{ created_at: string }[]>([]);
  const [canjes, setCanjes] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [cargoNegocios, setCargoNegocios] = useState(false);

  useEffect(() => {
    if (demo) { const d = datosDemo(); setNegocios([d.negocio]); setNegId("demo"); setClientes(d.clientes); setVisitas(d.visitas); setCanjes(d.canjes); setCargoNegocios(true); return; }
    const forzado = new URLSearchParams(location.search).get("n");
    negociosDelUsuario(uid, forzado).then((l) => { setNegocios(l); if (l[0]) setNegId(l[0].id); setCargoNegocios(true); });
  }, [uid, demo]);

  useEffect(() => {
    if (!negId || demo) return;
    setCargando(true);
    const desde = new Date(Date.now() - 14 * DIA).toISOString();
    Promise.all([
      sb.from("clientes").select("id,numero_socio,nombre,telefono,email,cumple,visitas,ultima_visita,created_at").eq("negocio_id", negId).order("numero_socio").limit(5000),
      sb.from("visitas").select("created_at").eq("negocio_id", negId).gte("created_at", desde).limit(5000),
      sb.from("canjes").select("id", { count: "exact", head: true }).eq("negocio_id", negId),
    ]).then(([c, v, k]) => {
      setClientes((c.data as Cli[]) ?? []); setVisitas((v.data as { created_at: string }[]) ?? []); setCanjes(k.count ?? 0);
      setCargando(false);
    });
  }, [negId, demo]);

  const neg = negocios.find((n) => n.id === negId);
  const ahora = Date.now();
  const venceMs = (neg?.vence_dias ?? 60) * DIA;
  // El contador solo vale mientras la tarjeta no esté vencida.
  const vigentes = (c: Cli) => (c.ultima_visita && ahora - new Date(c.ultima_visita).getTime() <= venceMs ? c.visitas : 0);
  const dormidos = clientes.filter((c) => !c.ultima_visita || ahora - new Date(c.ultima_visita).getTime() > 30 * DIA);
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
  const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-AR") : "—");

  if (!cargoNegocios) return <p className="muted">Cargando…</p>;
  if (!negocios.length) return <div className="aviso">Tu usuario todavía no está vinculado a un negocio. Pedile el alta a quien te dio el acceso.</div>;
  return (
    <>
      {negocios.length > 1 && <select value={negId} onChange={(e) => setNegId(e.target.value)}>{negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>}
      <h1>{neg?.nombre}</h1>
      {cargando && <p className="muted">Cargando…</p>}
      <div className="kpis">
        <div className="kpi"><b>{clientes.length}</b><span>Socios</span></div>
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

      <section className="box"><h2>Top 10 de clientes</h2>
        <table><thead><tr><th>Socio</th><th>Nombre</th><th>Visitas</th></tr></thead>
          <tbody>{top.map((c) => <tr key={c.id}><td>{socio(c.numero_socio)}</td><td>{c.nombre}</td><td>{vigentes(c)}</td></tr>)}</tbody></table>
      </section>

      <section className="box"><h2>Cumpleaños del mes</h2>
        {cumples.length ? <table><tbody>{cumples.map((c) => <tr key={c.id}><td>{c.nombre}</td><td>{new Date(c.cumple! + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</td></tr>)}</tbody></table> : <p className="muted small">Nadie cumple este mes (o no cargaron la fecha).</p>}
      </section>

      <section className="box"><h2>Todos los clientes</h2>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Socio</th><th>Nombre</th><th>Contacto</th><th>Visitas</th><th>Última visita</th></tr></thead>
          <tbody>{clientes.map((c) => <tr key={c.id}><td>{socio(c.numero_socio)}</td><td>{c.nombre}</td><td>{c.telefono || c.email}</td><td>{vigentes(c)}</td><td>{fecha(c.ultima_visita)}</td></tr>)}</tbody></table></div>
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
    </main>
  );
}
