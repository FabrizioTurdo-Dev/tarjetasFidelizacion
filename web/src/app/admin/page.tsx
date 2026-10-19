"use client";
import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/Auth";
import { Qr } from "@/components/Qr";
import { sb } from "@/lib/supabase";
import { BASE, diasPrueba, iniciales, marca, msg, slugify, type Negocio, type Premio } from "@/lib/util";

const ESTADO: Record<string, [string, string]> = {
  prueba: ["c-warn", "En prueba"], activa: ["c-good", "Activa"], vencida: ["c-bad", "Vencida"],
  suspendida: ["c-bad", "Suspendida"], cancelada: ["c-neutral", "Cancelada"],
};
type PremioEd = { id?: string; visitas: number; nombre: string };
type Miembro = { user_id: string; email: string; rol: "dueno" | "empleado" };

// Vista demo (/admin/?demo=1): datos de ejemplo, sin login ni base de datos. No guarda nada.
const hoy = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const DEMO_NEGOCIOS: Negocio[] = [
  { id: "d1", slug: "almadekh", nombre: "Almadekh", rubro: "Restaurante", color: "#7a3e2b", espera_horas: 6, vence_dias: 60, estado: "prueba", inicio_prueba: hoy(-12) },
  { id: "d2", slug: "cafe-marte", nombre: "Café Marte", rubro: "Cafetería", color: "#b3261e", espera_horas: 6, vence_dias: 60, estado: "activa", inicio_prueba: hoy(-70) },
  { id: "d3", slug: "peluqueria-sol", nombre: "Peluquería Sol", rubro: "Peluquería", color: "#2f5d50", espera_horas: 24, vence_dias: 90, estado: "suspendida", inicio_prueba: hoy(-120) },
];
const DEMO_PREMIOS: Record<string, PremioEd[]> = {
  d1: [{ id: "p1", visitas: 5, nombre: "Café de cortesía" }, { id: "p2", visitas: 10, nombre: "Postre gratis" }, { id: "p3", visitas: 100, nombre: "Cena para dos" }],
  d2: [{ id: "p4", visitas: 8, nombre: "Café gratis" }, { id: "p5", visitas: 15, nombre: "10% en la cuenta" }],
  d3: [{ id: "p6", visitas: 6, nombre: "Lavado gratis" }],
};
const DEMO_MIEMBROS: Record<string, Miembro[]> = {
  d1: [{ user_id: "u1", email: "dueno@almadekh.com", rol: "dueno" }, { user_id: "u2", email: "caja@almadekh.com", rol: "empleado" }],
  d2: [{ user_id: "u3", email: "pablo@cafemarte.com", rol: "dueno" }],
  d3: [],
};

function Admin({ uid, demo = false }: { uid: string; demo?: boolean }) {
  const [esSuper, setEsSuper] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Negocio[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [ed, setEd] = useState<Negocio | null>(null);
  const [premios, setPremios] = useState<PremioEd[]>([]);
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [nuevoMail, setNuevoMail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"dueno" | "empleado">("empleado");

  const cargarLista = useCallback(async () => {
    const { data } = await sb.from("negocios").select("*").order("created_at");
    setLista((data as Negocio[]) ?? []);
    return (data as Negocio[]) ?? [];
  }, []);

  useEffect(() => {
    if (demo) { setEsSuper(true); setLista(DEMO_NEGOCIOS); setSel("d1"); return; }
    sb.from("perfiles").select("es_superadmin").eq("id", uid).maybeSingle().then(({ data }) => {
      setEsSuper(!!data?.es_superadmin);
      if (data?.es_superadmin) cargarLista().then((l) => l[0] && setSel(l[0].id));
    });
  }, [cargarLista, uid, demo]);

  useEffect(() => {
    const n = lista.find((x) => x.id === sel) ?? null;
    setEd(n ? { ...n } : null);
    setAviso(null);
    setMiembros(null);
    if (!n) return;
    if (demo) { setPremios(DEMO_PREMIOS[n.id] ?? []); setMiembros(DEMO_MIEMBROS[n.id] ?? []); return; }
    sb.from("premios").select("id,visitas,nombre").eq("negocio_id", n.id).eq("activo", true).order("visitas")
      .then(({ data }) => setPremios((data as PremioEd[]) ?? []));
    sb.rpc("listar_miembros", { p_negocio: n.id }).then(({ data, error }) => setMiembros(error ? [] : (data as Miembro[])));
  }, [sel, lista, demo]);

  if (esSuper === null) return <p className="muted">Cargando…</p>;
  if (!esSuper) return <div className="aviso">Esta cuenta no es de superadmin.</div>;

  const set = <K extends keyof Negocio>(k: K, v: Negocio[K]) => setEd((e) => (e ? { ...e, [k]: v } : e));

  const soloDemo = () => setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." });

  async function nuevo() {
    if (demo) return soloDemo();
    const slug = "negocio-" + Math.random().toString(36).slice(2, 7);
    const { data, error } = await sb.from("negocios").insert({ slug, nombre: "Nuevo negocio" }).select().single();
    if (error) { setAviso({ ok: false, t: msg(error) }); return; }
    await cargarLista(); setSel((data as Negocio).id);
  }

  async function guardar() {
    if (!ed) return;
    if (demo) return soloDemo();
    if (!ed.nombre.trim()) { setAviso({ ok: false, t: "Falta el nombre del negocio." }); return; }
    if (premios.some((p) => !p.nombre.trim() || p.visitas < 1)) { setAviso({ ok: false, t: "Completá nombre y visitas de cada premio, o quitá los que sobran." }); return; }
    if (new Set(premios.map((p) => p.visitas)).size !== premios.length) { setAviso({ ok: false, t: "Dos premios no pueden pedir la misma cantidad de visitas." }); return; }
    const { id, slug, nombre, rubro, color, espera_horas, vence_dias, estado, inicio_prueba } = ed;
    const r = await sb.from("negocios").update({ slug: slugify(slug), nombre: nombre.trim(), rubro, color, espera_horas, vence_dias, estado, inicio_prueba }).eq("id", id);
    if (r.error) { setAviso({ ok: false, t: msg(r.error) }); return; }

    // Premios: los que ya no están se borran (o se desactivan si ya se canjearon); el resto se guarda.
    const { data: viejos } = await sb.from("premios").select("id").eq("negocio_id", id).eq("activo", true);
    const quedan = new Set(premios.filter((p) => p.id).map((p) => p.id));
    for (const v of (viejos as { id: string }[]) ?? []) {
      if (quedan.has(v.id)) continue;
      const d = await sb.from("premios").delete().eq("id", v.id);
      if (d.error) await sb.from("premios").update({ activo: false, visitas: 100000 + Math.floor(Math.random() * 1e6) }).eq("id", v.id);
    }
    for (const p of premios) {
      const res = p.id
        ? await sb.from("premios").update({ visitas: p.visitas, nombre: p.nombre.trim() }).eq("id", p.id)
        : await sb.from("premios").insert({ negocio_id: id, visitas: p.visitas, nombre: p.nombre.trim() });
      if (res.error) { setAviso({ ok: false, t: msg(res.error) }); return; }
    }
    const l = await cargarLista();
    if (!l.find((x) => x.id === id)) setSel(l[0]?.id ?? null);
    setAviso({ ok: true, t: "Guardado." });
  }

  async function agregar() {
    if (!ed || !nuevoMail.trim()) return;
    if (demo) return soloDemo();
    const { error } = await sb.rpc("agregar_miembro", { p_negocio: ed.id, p_email: nuevoMail, p_rol: nuevoRol });
    if (error) { setAviso({ ok: false, t: msg(error) }); return; }
    setNuevoMail("");
    const { data } = await sb.rpc("listar_miembros", { p_negocio: ed.id });
    setMiembros((data as Miembro[]) ?? []);
  }
  async function quitar(u: string) {
    if (!ed) return;
    if (demo) return soloDemo();
    await sb.rpc("quitar_miembro", { p_negocio: ed.id, p_user: u });
    setMiembros((m) => (m ?? []).filter((x) => x.user_id !== u));
  }

  const urlAlta = ed ? `${location.origin}${BASE}/alta/?n=${ed.slug}` : "";
  const sorted = [...premios].sort((a, b) => a.visitas - b.visitas);

  return (
    <div className="layout">
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((n) => {
          const e = ESTADO[n.estado]; const d = diasPrueba(n);
          return (
            <button key={n.id} className="neg" aria-current={n.id === sel} onClick={() => setSel(n.id)}>
              <span className="row"><strong>{n.nombre}</strong><span className={"chip " + e[0]}>{e[1]}</span></span>
              <span className="muted small">{n.estado === "prueba" ? (d > 0 ? `${d} días de prueba` : "Prueba terminada") : n.rubro || ""}</span>
            </button>);
        })}
        <button className="btn dark" onClick={nuevo}>+ Nuevo negocio</button>
      </section>

      {ed ? (<>
        <section className="box">
          <h2>{ed.nombre}</h2>
          <label>Nombre del negocio<input value={ed.nombre} onChange={(e) => set("nombre", e.target.value)} /></label>
          <div className="row2">
            <label>Rubro<input value={ed.rubro ?? ""} onChange={(e) => set("rubro", e.target.value)} placeholder="Restaurante, peluquería…" /></label>
            <label>Color de la tarjeta<input type="color" value={ed.color} onChange={(e) => set("color", e.target.value)} /></label>
          </div>
          <label>Dirección del QR (slug)<input value={ed.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <div className="row2">
            <label>Estado<select value={ed.estado} onChange={(e) => set("estado", e.target.value as Negocio["estado"])}>
              {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select></label>
            <label>Inicio de la prueba<input type="date" value={ed.inicio_prueba} onChange={(e) => set("inicio_prueba", e.target.value)} /></label>
          </div>
          <div className="row2">
            <label>Espera entre visitas (horas)<input type="number" min={0} max={72} value={ed.espera_horas} onChange={(e) => set("espera_horas", parseInt(e.target.value) || 0)} /></label>
            <label>Vencimiento (días sin visitas)<input type="number" min={7} max={365} value={ed.vence_dias} onChange={(e) => set("vence_dias", parseInt(e.target.value) || 60)} /></label>
          </div>

          <div><h2 style={{ marginBottom: 8 }}>Premios</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Las visitas son acumuladas: canjear un premio no las descuenta.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {premios.map((p, i) => (
                <div className="prem" key={i}>
                  <label>Visitas<input type="number" min={1} value={p.visitas} onChange={(e) => setPremios(premios.map((x, j) => j === i ? { ...x, visitas: parseInt(e.target.value) || 0 } : x))} /></label>
                  <label>Premio<input value={p.nombre} placeholder="Café con medialuna" onChange={(e) => setPremios(premios.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} /></label>
                  <button className="x" aria-label="Quitar premio" onClick={() => setPremios(premios.filter((_, j) => j !== i))}>✕</button>
                </div>))}
              {!premios.length && <p className="muted small">Sin premios todavía.</p>}
            </div>
            <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setPremios([...premios, { visitas: Math.max(0, ...premios.map((p) => p.visitas)) + 5, nombre: "" }])}>+ Agregar premio</button>
          </div>

          <div><h2 style={{ marginBottom: 8 }}>Usuarios del negocio</h2>
            {miembros === null ? <p className="muted small">Cargando…</p> : (<>
              {miembros.map((m) => (
                <div className="pr" key={m.user_id}><span>{m.email} <span className="chip c-neutral">{m.rol === "dueno" ? "Dueño" : "Empleado"}</span></span>
                  <button className="x" onClick={() => quitar(m.user_id)}>Quitar</button></div>))}
              {!miembros.length && <p className="muted small">Todavía no hay usuarios.</p>}
              <div className="prem" style={{ gridTemplateColumns: "1fr 120px auto", marginTop: 8 }}>
                <label>Mail del usuario<input type="email" value={nuevoMail} onChange={(e) => setNuevoMail(e.target.value)} placeholder="empleado@mail.com" /></label>
                <label>Rol<select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as "dueno" | "empleado")}><option value="empleado">Empleado</option><option value="dueno">Dueño</option></select></label>
                <button className="btn dark sm" onClick={agregar}>Agregar</button>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>El usuario tiene que existir antes en Supabase → Authentication → Users.</p>
            </>)}
          </div>

          {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
          <button className="btn" onClick={guardar}>Guardar cambios</button>
        </section>

        <aside className="prev" style={marca(ed.color)}>
          <div className="box">
            <h2>Así se ve la tarjeta</h2>
            <div className="mini">
              <div className="biz"><div className="logo">{iniciales(ed.nombre)}</div><strong>{ed.nombre}</strong></div>
              <div className="count">7 <small>visitas</small></div>
              <div className="pl">{sorted.map((p, i) => <div key={i}><span>{p.nombre || "—"}</span><span>{p.visitas}{7 >= p.visitas ? " ✓" : ""}</span></div>)}</div>
            </div>
            <h2>QR para el mostrador</h2>
            <div className="qrwrap"><Qr texto={urlAlta} /></div>
            <p className="small muted" style={{ wordBreak: "break-all" }}>{urlAlta}</p>
          </div>
        </aside>
      </>) : <p className="muted">Elegí un negocio o creá uno nuevo.</p>}
    </div>
  );
}

export default function Page() {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(new URLSearchParams(location.search).has("demo")), []);
  return (
    <main className="screen wide">
      <h1>Administración</h1>
      {demo
        ? (<><div className="aviso">Vista demo con datos de ejemplo. Nada de esto se guarda.</div><Admin uid="" demo /></>)
        : <RequireAuth mfa>{(s) => <Admin uid={s.user.id} />}</RequireAuth>}
    </main>
  );
}
