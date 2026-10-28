"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/Auth";
import { EditorPremios, type PremioEd } from "@/components/EditorPremios";
import { EditorInfo, infoDeNegocio } from "@/components/Info";
import { Qr } from "@/components/Qr";
import { ESTADO, Resumen, type DatosResumen } from "@/components/admin/Resumen";
import { Solicitudes, type Solicitud } from "@/components/admin/Solicitudes";
import { Avisos } from "@/components/admin/Avisos";
import { sb } from "@/lib/supabase";
import { BASE, diasPrueba, iniciales, linkWa, marca, msg, slugify, type Info, type Negocio } from "@/lib/util";
import { CUPO_FUNDADORES, PRECIO, PRECIO_FUNDADOR } from "@/lib/precios";

type Miembro = { user_id: string; email: string; rol: "dueno" | "empleado" };
type Privado = { contacto_nombre: string; contacto_whatsapp: string; notas: string };
type Cambio = { accion: string; antes: { visitas: number; nombre: string } | null; despues: { visitas: number; nombre: string } | null; usuario_email: string | null; created_at: string };
const PRIVADO_VACIO: Privado = { contacto_nombre: "", contacto_whatsapp: "", notas: "" };
const ACCION: Record<string, string> = { alta: "Agregó", edicion: "Cambió", pausa: "Pausó", reactivacion: "Reactivó", baja: "Quitó" };
const SEMANAS = 8;

/** Contraseña para pasarle al negocio: 10 caracteres sin los que se confunden (0/O, 1/l/I). */
function generarClave() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => letras[n % letras.length]).join("");
}

/** Función "usuarios" de Supabase (crear usuario / cambiar contraseña). Devuelve el error ya traducido, o null. */
async function funcionUsuarios(body: Record<string, unknown>): Promise<string | null> {
  const { error } = await sb.functions.invoke("usuarios", { body });
  if (!error) return null;
  try {
    const j = await (error as { context?: Response }).context?.json();
    if (j?.error) return msg(j.error);
  } catch { /* la respuesta no traía detalle */ }
  return msg(error);
}

// Vista demo (/admin/?demo=1): datos de ejemplo, sin login ni base de datos. No guarda nada.
const hoy = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const DEMO_NEGOCIOS: Negocio[] = [
  { id: "d1", slug: "almadekh", nombre: "Almadekh", rubro: "Restaurante", color: "#7a3e2b", espera_horas: 6, vence_dias: 60, estado: "prueba", inicio_prueba: hoy(-12), resenas_url: "https://g.page/r/ejemplo/review" },
  { id: "d2", slug: "cafe-marte", nombre: "Café Marte", rubro: "Cafetería", color: "#b3261e", espera_horas: 6, vence_dias: 60, estado: "activa", inicio_prueba: hoy(-70) },
  { id: "d3", slug: "peluqueria-sol", nombre: "Peluquería Sol", rubro: "Peluquería", color: "#2f5d50", espera_horas: 24, vence_dias: 90, estado: "suspendida", inicio_prueba: hoy(-120) },
];
const DEMO_PREMIOS: Record<string, PremioEd[]> = {
  d1: [{ id: "p1", visitas: 5, nombre: "Café de cortesía", activo: true }, { id: "p2", visitas: 10, nombre: "Postre gratis", activo: true }, { id: "p3", visitas: 100, nombre: "Cena para dos", activo: true }],
  d2: [{ id: "p4", visitas: 8, nombre: "Café gratis", activo: true }, { id: "p5", visitas: 15, nombre: "10% en la cuenta", activo: true }],
  d3: [{ id: "p6", visitas: 6, nombre: "Lavado gratis", activo: false }],
};
const DEMO_MIEMBROS: Record<string, Miembro[]> = {
  d1: [{ user_id: "u1", email: "dueno@almadekh.com", rol: "dueno" }, { user_id: "u2", email: "caja@almadekh.com", rol: "empleado" }],
  d2: [{ user_id: "u3", email: "pablo@cafemarte.com", rol: "dueno" }],
  d3: [],
};
const DEMO_SOCIOS: Record<string, number> = { d1: 24, d2: 87, d3: 12 };
const DEMO_RESUMEN: DatosResumen = {
  clientes_total: 123, clientes_30: 31, visitas_30: 402, canjes_30: 37, solicitudes_nuevas: 1, lugares_fundadores: 10,
  negocios: DEMO_NEGOCIOS.map((n, i) => ({
    ...n, rubro: n.rubro, clientes: DEMO_SOCIOS[n.id], clientes_30: [9, 22, 0][i], visitas_30: [118, 284, 0][i], canjes_30: [11, 26, 0][i],
    ultima_visita: i === 2 ? new Date(Date.now() - 40 * 864e5).toISOString() : new Date(Date.now() - i * 864e5).toISOString(),
    premios: DEMO_PREMIOS[n.id].map(({ visitas, nombre, activo }) => ({ visitas, nombre, activo })),
    ultimo_cambio: i === 0 ? { fecha: new Date(Date.now() - 3 * 864e5).toISOString(), email: "dueno@almadekh.com", accion: "edicion" } : null,
    contacto_nombre: ["Ana", "Pablo", null][i], contacto_whatsapp: ["11 2345 6789", "11 3456 7890", null][i],
  })),
};
const DEMO_SOLICITUDES: Solicitud[] = [
  { id: "s1", created_at: new Date(Date.now() - 2 * 36e5).toISOString(), negocio: "Panadería La Espiga", rubro: "Panadería", ciudad: "Escobar", pais: "Argentina", nombre: "Marta", whatsapp: "11 4567 8901", email: null, como_nos_conocio: "Vi la tarjeta en Almadekh", estado: "nueva", negocio_id: null, para_fundador: true },
];

function Admin({ uid, demo = false }: { uid: string; demo?: boolean }) {
  const [esSuper, setEsSuper] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Negocio[]>([]);
  const [socios, setSocios] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [ed, setEd] = useState<Negocio | null>(null);
  const [premios, setPremios] = useState<PremioEd[]>([]);
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [nuevoMail, setNuevoMail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"dueno" | "empleado">("empleado");
  const [nuevaPass, setNuevaPass] = useState("");
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [avisoU, setAvisoU] = useState<{ ok: boolean; t: string } | null>(null);
  const [acceso, setAcceso] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [confirmaNombre, setConfirmaNombre] = useState("");
  const [borrado, setBorrado] = useState("");
  const [vista, setVista] = useState<"resumen" | "negocios" | "solicitudes">("resumen");
  const [resumen, setResumen] = useState<DatosResumen | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [priv, setPriv] = useState<Privado>(PRIVADO_VACIO);
  const [cambios, setCambios] = useState<Cambio[] | null>(null);
  const [semanas, setSemanas] = useState<number[]>([]);
  const [info, setInfo] = useState<Info | null>(null);

  const cargarLista = useCallback(async () => {
    const { data } = await sb.from("negocios").select("*").order("created_at");
    const l = (data as Negocio[]) ?? [];
    setLista(l);
    // Clientes con tarjeta en cada negocio (conteo exacto, sin traer los datos).
    Promise.all(l.map((n) => sb.from("clientes").select("id", { count: "exact", head: true }).eq("negocio_id", n.id)
      .then(({ count }) => [n.id, count ?? 0] as const))).then((r) => setSocios(Object.fromEntries(r)));
    return l;
  }, []);

  const cargarResumen = useCallback(async () => {
    const { data, error } = await sb.rpc("resumen_admin");
    if (!error) setResumen(data as DatosResumen);
  }, []);
  const cargarSolicitudes = useCallback(async () => {
    const { data } = await sb.from("solicitudes").select("id,created_at,negocio,rubro,ciudad,pais,nombre,whatsapp,email,como_nos_conocio,estado,negocio_id,para_fundador").order("created_at", { ascending: false }).limit(300);
    setSolicitudes((data as Solicitud[]) ?? []);
  }, []);
  const cargarCambios = useCallback((id: string) => {
    sb.from("premios_cambios").select("accion,antes,despues,usuario_email,created_at").eq("negocio_id", id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setCambios((data as Cambio[]) ?? []));
  }, []);

  // ?v=solicitudes: el aviso del celular abre directo esa pestaña.
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("v");
    if (v === "solicitudes" || v === "negocios") setVista(v);
  }, []);

  useEffect(() => {
    if (demo) { setEsSuper(true); setLista(DEMO_NEGOCIOS); setSocios(DEMO_SOCIOS); setSel("d1"); setResumen(DEMO_RESUMEN); setSolicitudes(DEMO_SOLICITUDES); return; }
    sb.from("perfiles").select("es_superadmin").eq("id", uid).maybeSingle().then(({ data }) => {
      setEsSuper(!!data?.es_superadmin);
      if (data?.es_superadmin) { cargarLista().then((l) => l[0] && setSel(l[0].id)); cargarResumen(); cargarSolicitudes(); }
    });
  }, [cargarLista, cargarResumen, cargarSolicitudes, uid, demo]);

  useEffect(() => {
    const n = lista.find((x) => x.id === sel) ?? null;
    setEd(n ? { ...n } : null);
    setAviso(null);
    setMiembros(null);
    setAvisoU(null); setAcceso(""); setCambiando(null);
    setBorrando(false); setConfirmaNombre("");
    setPriv(PRIVADO_VACIO); setCambios(null); setSemanas([]); setInfo(null);
    if (!n) return;
    if (demo) {
      setPremios(DEMO_PREMIOS[n.id] ?? []); setMiembros(DEMO_MIEMBROS[n.id] ?? []);
      const f = DEMO_RESUMEN.negocios.find((x) => x.id === n.id);
      setPriv({ contacto_nombre: f?.contacto_nombre ?? "", contacto_whatsapp: f?.contacto_whatsapp ?? "", notas: "" });
      setCambios(n.id === "d1" ? [{ accion: "edicion", antes: { visitas: 8, nombre: "Postre gratis" }, despues: { visitas: 10, nombre: "Postre gratis" }, usuario_email: "dueno@almadekh.com", created_at: new Date(Date.now() - 3 * 864e5).toISOString() }] : []);
      setSemanas(n.id === "d3" ? Array(SEMANAS).fill(0) : [22, 31, 27, 35, 30, 41, 38, 29]);
      setInfo(infoDeNegocio(n));
      return;
    }
    sb.from("premios").select("id,visitas,nombre,activo").eq("negocio_id", n.id).is("archivado_at", null).order("visitas")
      .then(({ data }) => setPremios((data as PremioEd[]) ?? []));
    sb.from("negocios_privado").select("contacto_nombre,contacto_whatsapp,notas").eq("negocio_id", n.id).maybeSingle()
      .then(({ data }) => setPriv({ contacto_nombre: data?.contacto_nombre ?? "", contacto_whatsapp: data?.contacto_whatsapp ?? "", notas: data?.notas ?? "" }));
    // El bloque de información se lee aparte (como los premios): se guarda con su propio botón.
    sb.from("negocios").select("info_titulo,info_texto,info_links").eq("id", n.id).maybeSingle()
      .then(({ data }) => setInfo(infoDeNegocio(data ?? {})));
    cargarCambios(n.id);
    // Visitas por semana (la última es la que termina hoy).
    sb.from("visitas").select("created_at").eq("negocio_id", n.id).gte("created_at", new Date(Date.now() - SEMANAS * 7 * 864e5).toISOString()).limit(20000)
      .then(({ data }) => {
        const s = Array(SEMANAS).fill(0);
        for (const v of (data as { created_at: string }[]) ?? []) {
          const i = SEMANAS - 1 - Math.floor((Date.now() - new Date(v.created_at).getTime()) / (7 * 864e5));
          if (i >= 0) s[i]++;
        }
        setSemanas(s);
      });
    sb.rpc("listar_miembros", { p_negocio: n.id }).then(({ data, error }) => setMiembros(error ? [] : (data as Miembro[])));
  }, [sel, lista, demo, cargarCambios]);

  if (esSuper === null) return <p className="muted">Cargando…</p>;
  if (!esSuper) return <div className="aviso">Esta cuenta no es de superadmin.</div>;

  const set = <K extends keyof Negocio>(k: K, v: Negocio[K]) => setEd((e) => (e ? { ...e, [k]: v } : e));

  const soloDemo = () => setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." });

  async function nuevo() {
    if (demo) return soloDemo();
    setBorrado("");
    const slug = "negocio-" + Math.random().toString(36).slice(2, 7);
    const { data, error } = await sb.from("negocios").insert({ slug, nombre: "Nuevo negocio" }).select().single();
    if (error) { setAviso({ ok: false, t: msg(error) }); return; }
    await cargarLista(); setSel((data as Negocio).id);
  }

  async function guardar() {
    if (!ed) return;
    if (demo) return soloDemo();
    if (!ed.nombre.trim()) { setAviso({ ok: false, t: "Falta el nombre del negocio." }); return; }
    const resenas_url = ed.resenas_url?.trim() || null;
    if (resenas_url && !/^https:\/\/\S+$/.test(resenas_url)) { setAviso({ ok: false, t: "El link de reseñas tiene que empezar con https:// y no llevar espacios." }); return; }
    if (ed.fundador && !eraFundador && libres <= 0) { setAviso({ ok: false, t: `Ya están ocupados los ${CUPO_FUNDADORES} lugares de socio fundador.` }); return; }
    const { id, slug, nombre, rubro, color, espera_horas, vence_dias, estado, inicio_prueba, interno, fundador } = ed;
    const r = await sb.from("negocios").update({ slug: slugify(slug), nombre: nombre.trim(), rubro, color, espera_horas, vence_dias, estado, inicio_prueba, resenas_url, interno: !!interno, fundador: !!fundador }).eq("id", id);
    if (r.error) { setAviso({ ok: false, t: msg(r.error) }); return; }

    // Contacto del dueño: solo lo ve el superadmin (los premios se guardan aparte, con su botón).
    const pr = await sb.from("negocios_privado").upsert({
      negocio_id: id, contacto_nombre: priv.contacto_nombre.trim() || null, contacto_whatsapp: priv.contacto_whatsapp.trim() || null,
      notas: priv.notas.trim() || null, updated_at: new Date().toISOString(),
    });
    if (pr.error) { setAviso({ ok: false, t: msg(pr.error) }); return; }
    cargarResumen();
    const l = await cargarLista();
    if (!l.find((x) => x.id === id)) setSel(l[0]?.id ?? null);
    setAviso({ ok: true, t: "Guardado." });
  }

  // Borra el negocio y, en cascada, sus premios, clientes, visitas, canjes y vínculos con usuarios.
  // Los usuarios de Auth no se borran (pueden estar en otros negocios).
  async function eliminar() {
    if (!ed) return;
    if (demo) return soloDemo();
    const nombre = lista.find((x) => x.id === ed.id)?.nombre ?? ed.nombre;
    const { data, error } = await sb.from("negocios").delete().eq("id", ed.id).select("id");
    if (error) { setAviso({ ok: false, t: msg(error) }); return; }
    if (!data?.length) { setAviso({ ok: false, t: "No se pudo eliminar. Cerrá sesión, volvé a entrar y probá de nuevo." }); return; }
    const l = await cargarLista();
    setSel(l[0]?.id ?? null);
    cargarResumen();
    setBorrado(`Eliminaste ${nombre}.`);
  }

  // Mensaje listo para mandarle al negocio por WhatsApp con sus datos de acceso.
  const textoAcceso = (email: string, pass: string) =>
    `¡Hola! Ya tenés tu acceso a De la Casa para ${ed?.nombre}.\nEntrá desde acá: ${location.origin}${BASE}/panel/\nMail: ${email}\nContraseña: ${pass}\nCómo se usa: ${location.origin}${BASE}/guia/`;

  // Si el mail ya tiene usuario, solo se vincula. Si no, se crea con la contraseña (función "usuarios").
  async function agregar() {
    if (!ed || !nuevoMail.trim()) return;
    if (demo) return soloDemo();
    setAvisoU(null); setAcceso("");
    const email = nuevoMail.trim().toLowerCase(), pass = nuevaPass.trim();
    const { error } = await sb.rpc("agregar_miembro", { p_negocio: ed.id, p_email: email, p_rol: nuevoRol });
    if (error && !error.message.includes("usuario_inexistente")) { setAvisoU({ ok: false, t: msg(error) }); return; }
    if (error) {
      if (!pass) { setAvisoU({ ok: false, t: "Ese mail todavía no tiene usuario: escribí una contraseña (o tocá Generar) para crearlo." }); return; }
      const e = await funcionUsuarios({ accion: "crear", negocio_id: ed.id, email, password: pass, rol: nuevoRol });
      if (e) { setAvisoU({ ok: false, t: e }); return; }
      setAcceso(textoAcceso(email, pass));
      setAvisoU({ ok: true, t: "Usuario creado y vinculado al negocio." });
    } else {
      setAvisoU({ ok: true, t: pass ? "Ese mail ya tenía usuario: lo vinculé y sigue con su contraseña de siempre." : "Usuario vinculado al negocio." });
    }
    setNuevoMail(""); setNuevaPass("");
    const { data } = await sb.rpc("listar_miembros", { p_negocio: ed.id });
    setMiembros((data as Miembro[]) ?? []);
  }
  async function cambiarClave(m: Miembro) {
    if (demo) return soloDemo();
    setAvisoU(null); setAcceso("");
    const pass = nuevaClave.trim();
    const e = await funcionUsuarios({ accion: "clave", user_id: m.user_id, password: pass });
    if (e) { setAvisoU({ ok: false, t: e }); return; }
    setCambiando(null);
    setAcceso(textoAcceso(m.email, pass));
    setAvisoU({ ok: true, t: `Contraseña cambiada para ${m.email}.` });
  }
  async function quitar(m: Miembro) {
    if (!ed) return;
    if (demo) return soloDemo();
    if (!confirm(`¿Quitar a ${m.email} de ${ed.nombre}? El usuario no se borra: solo deja de entrar a este negocio.`)) return;
    await sb.rpc("quitar_miembro", { p_negocio: ed.id, p_user: m.user_id });
    setMiembros((l) => (l ?? []).filter((x) => x.user_id !== m.user_id));
  }
  async function copiarAcceso() {
    try { await navigator.clipboard.writeText(acceso); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* queda a la vista */ }
  }

  const urlAlta = ed ? `${location.origin}${BASE}/alta/?n=${ed.slug}` : "";
  const sorted = premios.filter((p) => p.activo).sort((a, b) => a.visitas - b.visitas);
  const maxSemana = Math.max(1, ...semanas);
  const fecha = (s: string) => new Date(s).toLocaleDateString("es-AR");
  // Para borrar hay que escribir el nombre guardado (no el que está a medio editar).
  const nombreGuardado = ed ? lista.find((x) => x.id === ed.id)?.nombre ?? ed.nombre : "";
  const nombreOk = confirmaNombre.trim().toLowerCase() === nombreGuardado.trim().toLowerCase();
  const nClientes = ed ? socios[ed.id] : undefined;
  // Lugares de socio fundador libres según lo guardado (la página pública los cuenta igual: lugares_fundadores).
  const libres = Math.max(0, CUPO_FUNDADORES - lista.filter((x) => x.fundador).length);
  const eraFundador = !!(ed && lista.find((x) => x.id === ed.id)?.fundador);

  const abrir = (id: string) => { setSel(id); setBorrado(""); setVista("negocios"); };
  const pestanas = (
    <div className="links" role="tablist">
      {([["resumen", "Resumen"], ["negocios", "Negocios"], ["solicitudes", `Solicitudes${resumen?.solicitudes_nuevas ? ` (${resumen.solicitudes_nuevas})` : ""}`]] as const).map(([k, t]) => (
        <button key={k} role="tab" aria-selected={vista === k} className={"tab" + (vista === k ? " on" : "")} onClick={() => setVista(k)}>{t}</button>))}
    </div>);

  if (vista === "resumen") return (<>{pestanas}<Resumen datos={resumen} onAbrir={abrir} onSolicitudes={() => setVista("solicitudes")} /></>);
  if (vista === "solicitudes") return (<>{pestanas}<Avisos demo={demo} /><Solicitudes lista={solicitudes} demo={demo} lugares={resumen?.lugares_fundadores}
    onCambio={() => { cargarSolicitudes(); cargarResumen(); }}
    onCreado={(id) => { cargarLista().then(() => abrir(id)); }} /></>);

  return (<>
    {pestanas}
    <div className="layout">
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((n) => {
          const e = ESTADO[n.estado]; const d = diasPrueba(n);
          return (
            <button key={n.id} className="neg" aria-current={n.id === sel} onClick={() => { setSel(n.id); setBorrado(""); }}>
              <span className="row"><strong>{n.nombre}</strong><span style={{ display: "flex", gap: 4 }}>{n.fundador && <span className="chip c-warn">Fundador</span>}<span className={"chip " + (n.interno ? "c-neutral" : e[0])}>{n.interno ? "Interno" : e[1]}</span></span></span>
              <span className="muted small">{socios[n.id] === undefined ? "" : `${socios[n.id]} ${socios[n.id] === 1 ? "cliente" : "clientes"} · `}{n.estado === "prueba" ? (d > 0 ? `${d} días de prueba` : "Prueba terminada") : n.rubro || ""}</span>
            </button>);
        })}
        <button className="btn dark" onClick={nuevo}>+ Nuevo negocio</button>
        {borrado && <div className="okmsg">{borrado}</div>}
      </section>

      {ed ? (<>
        <section className="box">
          <div className="top" style={{ flexWrap: "wrap" }}>
            <h2>{ed.nombre}</h2>
            <span className="chip c-neutral">{socios[ed.id] ?? "…"} {socios[ed.id] === 1 ? "cliente tiene" : "clientes tienen"} la tarjeta</span>
          </div>
          {eraFundador && <p className="tip"><b>Socio fundador.</b> Paga {PRECIO_FUNDADOR} por mes durante 6 meses; después, {PRECIO}.</p>}
          {!demo && <div className="links"><Link href={`/panel/?n=${lista.find((x) => x.id === ed.id)?.slug ?? ed.slug}`}>Ver su panel: clientes y links de cada tarjeta →</Link></div>}
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
          <label>Link de reseñas de Google (opcional)<input type="url" value={ed.resenas_url ?? ""} onChange={(e) => set("resenas_url", e.target.value)} placeholder="https://g.page/r/…/review" /></label>
          <p className="small muted" style={{ marginTop: -6 }}>El dueño lo saca de su Perfil de Empresa de Google → <b>Pedir reseñas</b>. Con el link cargado, la tarjeta le ofrece al cliente dejar su reseña a partir de la 2ª visita, una sola vez y sin nada a cambio.</p>
          <label className="check"><input type="checkbox" checked={!!ed.interno} onChange={(e) => set("interno", e.target.checked)} />
            <span>Negocio interno <span className="small muted" style={{ display: "block", fontWeight: 400 }}>De De la Casa (demo, el tuyo): no cuenta en los números del Resumen.</span></span></label>
          <label className="check"><input type="checkbox" checked={!!ed.fundador} disabled={!eraFundador && libres <= 0} onChange={(e) => set("fundador", e.target.checked)} />
            <span>Socio fundador <span className="small muted" style={{ display: "block", fontWeight: 400 }}>
              {PRECIO_FUNDADOR} por mes durante 6 meses. {libres ? `Quedan ${libres} de ${CUPO_FUNDADORES} lugares` : "Ya no quedan lugares"}: cada fundador ocupa uno y la página baja el contador al guardar. Los que entran desde una solicitud se marcan solos.</span></span></label>

          <div><h2 style={{ marginBottom: 4 }}>Contacto del dueño</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Solo lo ves vos. Se guarda con "Guardar cambios".</p>
            <div className="row2">
              <label>Nombre<input value={priv.contacto_nombre} maxLength={80} onChange={(e) => setPriv({ ...priv, contacto_nombre: e.target.value })} /></label>
              <label>WhatsApp<input value={priv.contacto_whatsapp} maxLength={30} inputMode="tel" placeholder="11 2345 6789" onChange={(e) => setPriv({ ...priv, contacto_whatsapp: e.target.value })} /></label>
            </div>
            <label style={{ marginTop: 8 }}>Notas (cobros, acuerdos)<textarea rows={3} maxLength={2000} value={priv.notas} onChange={(e) => setPriv({ ...priv, notas: e.target.value })} /></label>
            {priv.contacto_whatsapp.trim() && <a className="btn ghost sm" style={{ marginTop: 8 }} href={linkWa(priv.contacto_whatsapp, `¡Hola${priv.contacto_nombre ? " " + priv.contacto_nombre.trim() : ""}! Soy Fabrizio, de De la Casa. `)} target="_blank" rel="noopener noreferrer">Escribirle por WhatsApp</a>}
          </div>

          <div><h2 style={{ marginBottom: 8 }}>Visitas por semana</h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70 }}>
              {semanas.map((n, i) => <div key={i} title={`${n} visitas`} style={{ flex: 1, background: "var(--ink)", opacity: .8, borderRadius: 3, height: Math.max(3, (n / maxSemana) * 70) }} />)}
            </div>
            <div className="bar-l muted" style={{ opacity: 1 }}><span>hace {SEMANAS} semanas</span><span>esta semana: {semanas[SEMANAS - 1] ?? 0}</span></div>
          </div>

          <div><h2 style={{ marginBottom: 4 }}>Usuarios del negocio</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Dueño: ve el panel y escanea. Empleado: solo escanea.</p>
            {miembros === null ? <p className="muted small">Cargando…</p> : (<>
              {miembros.map((m) => (
                <div key={m.user_id}>
                  <div className="pr" style={{ flexWrap: "wrap" }}><span style={{ overflowWrap: "anywhere" }}>{m.email} <span className="chip c-neutral">{m.rol === "dueno" ? "Dueño" : "Empleado"}</span></span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="x" onClick={() => { setCambiando(m.user_id); setNuevaClave(generarClave()); setAvisoU(null); }}>Contraseña</button>
                      <button className="x" onClick={() => quitar(m)}>Quitar</button></span></div>
                  {cambiando === m.user_id && (
                    <div className="prem" style={{ gridTemplateColumns: "1fr auto auto", marginBottom: 8 }}>
                      <label>Contraseña nueva<input value={nuevaClave} autoComplete="off" onChange={(e) => setNuevaClave(e.target.value)} /></label>
                      <button className="btn dark sm" onClick={() => cambiarClave(m)}>Guardar</button>
                      <button className="x" onClick={() => setCambiando(null)}>Cancelar</button>
                    </div>)}
                </div>))}
              {!miembros.length && <p className="muted small">Todavía no hay usuarios.</p>}
              <div className="prem" style={{ gridTemplateColumns: "1fr 120px", marginTop: 8 }}>
                <label>Mail del usuario<input type="email" value={nuevoMail} onChange={(e) => setNuevoMail(e.target.value)} placeholder="dueno@mail.com" /></label>
                <label>Rol<select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as "dueno" | "empleado")}><option value="empleado">Empleado</option><option value="dueno">Dueño</option></select></label>
              </div>
              <div className="prem" style={{ gridTemplateColumns: "1fr auto auto", marginTop: 8 }}>
                <label>Contraseña (para un usuario nuevo)<input value={nuevaPass} autoComplete="off" onChange={(e) => setNuevaPass(e.target.value)} placeholder="Mínimo 8 caracteres" /></label>
                <button className="x" onClick={() => setNuevaPass(generarClave())}>Generar</button>
                <button className="btn dark sm" onClick={agregar}>Agregar</button>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>Si el mail ya tiene usuario (por ejemplo, el dueño de otro negocio), dejá la contraseña vacía: solo se vincula.</p>
              {avisoU && <div className={avisoU.ok ? "okmsg" : "errmsg"} style={{ marginTop: 8 }}>{avisoU.t}</div>}
              {acceso && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <p className="small muted">Mandale esto por WhatsApp (la contraseña no se vuelve a mostrar):</p>
                  <p className="linkt" style={{ whiteSpace: "pre-line" }}>{acceso}</p>
                  <button className="btn ghost sm" onClick={copiarAcceso}>{copiado ? "¡Copiado!" : "Copiar mensaje"}</button>
                </div>)}
            </>)}
          </div>

          {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
          <button className="btn" onClick={guardar}>Guardar cambios</button>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}><h2 style={{ marginBottom: 4 }}>Premios</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>El dueño también los puede cambiar desde su panel. Se guardan con su propio botón.</p>
            <EditorPremios negocioId={ed.id} inicial={premios} demo={demo} onGuardado={(p) => { setPremios(p); cargarResumen(); cargarCambios(ed.id); }} />
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}><h2 style={{ marginBottom: 4 }}>Información en la tarjeta</h2>
            <p className="small muted" style={{ marginBottom: 8 }}>Texto y links que ve el cliente debajo de los premios. El dueño también lo puede cambiar desde su panel.</p>
            {info ? <EditorInfo key={ed.id} negocioId={ed.id} inicial={info} demo={demo} onGuardado={setInfo} /> : <p className="muted small">Cargando…</p>}
          </div>

          <div><h2 style={{ marginBottom: 8 }}>Historial de premios</h2>
            {cambios === null ? <p className="muted small">Cargando…</p> : cambios.length ? cambios.map((c, i) => (
              <div className="pr small" key={i}>
                <span>{ACCION[c.accion] ?? c.accion} {c.antes && c.despues
                  ? <>«{c.antes.nombre}» ({c.antes.visitas}) → «{c.despues.nombre}» ({c.despues.visitas})</>
                  : <>«{(c.despues ?? c.antes)?.nombre}» ({(c.despues ?? c.antes)?.visitas} visitas)</>}</span>
                <span className="muted" style={{ textAlign: "right" }}>{fecha(c.created_at)}<br />{c.usuario_email}</span>
              </div>)) : <p className="muted small">Sin cambios registrados todavía.</p>}
          </div>

          <div className="borrar">
            {!borrando ? (
              <button className="x" style={{ alignSelf: "flex-start", color: "var(--bad)" }} onClick={() => { setBorrando(true); setConfirmaNombre(""); setAviso(null); }}>Eliminar este negocio…</button>
            ) : (<>
              <h2>Eliminar {nombreGuardado}</h2>
              <p className="small">Se borra para siempre: la tarjeta, los premios{nClientes ? `, ${nClientes === 1 ? "el cliente" : `los ${nClientes} clientes`} con sus visitas y canjes` : ""}. {nClientes ? "Sus links y QR dejan de andar. " : ""}No se puede deshacer.</p>
              <p className="small muted">Los usuarios del negocio no se borran: solo dejan de entrar acá. Si el negocio dejó de usar De la Casa y querés conservar su historial, mejor cambiá el estado a Cancelada.</p>
              <label>Para confirmar, escribí el nombre: <strong>{nombreGuardado}</strong>
                <input value={confirmaNombre} autoComplete="off" onChange={(e) => setConfirmaNombre(e.target.value)} /></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn peligro sm" disabled={!nombreOk} onClick={eliminar}>Eliminar para siempre</button>
                <button className="x" onClick={() => setBorrando(false)}>Cancelar</button>
              </div>
            </>)}
          </div>
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
            <Link className="btn dark" href={demo ? "/cartel/?demo=1" : `/cartel/?n=${lista.find((x) => x.id === ed.id)?.slug ?? ed.slug}`}>Imprimir cartel para el mostrador</Link>
          </div>
        </aside>
      </>) : <p className="muted">Elegí un negocio o creá uno nuevo.</p>}
    </div>
  </>);
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
