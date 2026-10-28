"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { BASE, esIos, msg } from "@/lib/util";

// Avisos al celular cuando alguien completa el formulario "Quiero probarlo" (notificaciones web).
// Se activan por celular: el navegador da una suscripción, se guarda en avisos_suscripciones y la función
// "avisos" (migración 0008) manda ahí cada solicitud nueva. En iPhone solo andan desde el ícono de la pantalla de inicio.

/** Clave pública VAPID. La privada es el secreto VAPID_PRIVADA de la función "avisos" (copia en privado/, fuera de git). */
const VAPID_PUBLICA = "BP1JdBESoqkWthnV96hcaOj-XoZ5Fo5vFUJHq7kbd7GUPMQF4ZRDGg-HnzdRMi5Gef2c0c--kSJGBEPxQh2jpIU";

const deB64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

type Estado = "cargando" | "sin_soporte" | "ios_instalar" | "bloqueado" | "apagado" | "activo";

/** Guarda (o vuelve a guardar) la suscripción de este celular. Devuelve el error ya traducido, o null. */
async function guardar(s: PushSubscription): Promise<string | null> {
  const j = s.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return "El navegador no dio los datos para avisarte.";
  const { error } = await sb.from("avisos_suscripciones").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
  return error ? msg(error) : null;
}

export function Avisos({ demo = false }: { demo?: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const instalada = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEstado(esIos() && !instalada ? "ios_instalar" : "sin_soporte"); return;
    }
    if (Notification.permission === "denied") { setEstado("bloqueado"); return; }
    navigator.serviceWorker.getRegistration(`${BASE}/`).then(async (reg) => {
      const s = await reg?.pushManager.getSubscription();
      setEstado(s ? "activo" : "apagado");
      if (s && !demo) guardar(s); // por si se borró de la base (por ejemplo, si un aviso no llegó)
    });
  }, [demo]);

  async function activar() {
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setAviso(null); setOcupado(true);
    try {
      // El permiso se pide primero, todavía dentro del toque (iPhone lo exige).
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "bloqueado" : "apagado"); return; }
      await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });
      const reg = await navigator.serviceWorker.ready;
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(VAPID_PUBLICA) }));
      const e = await guardar(s);
      if (e) { setAviso({ ok: false, t: e }); return; }
      setEstado("activo");
      setAviso({ ok: true, t: "Listo: este celular te va a avisar cada solicitud nueva. Tocá «Probar» para ver cómo llega." });
    } catch {
      setAviso({ ok: false, t: "No se pudieron activar los avisos en este navegador." });
    } finally { setOcupado(false); }
  }

  async function probar() {
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setAviso(null); setOcupado(true);
    const { data, error } = await sb.functions.invoke("avisos", { body: { prueba: true } });
    setOcupado(false);
    if (error) { setAviso({ ok: false, t: "No se pudo mandar la prueba. Probá de nuevo en un rato." }); return; }
    setAviso(data?.enviados ? { ok: true, t: "Mandé el aviso de prueba: tiene que llegarte en unos segundos." }
      : { ok: false, t: "No llegó a ningún celular. Desactivá y volvé a activar los avisos." });
  }

  async function desactivar() {
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setAviso(null); setOcupado(true);
    const s = await (await navigator.serviceWorker.getRegistration(`${BASE}/`))?.pushManager.getSubscription();
    if (s) { await sb.from("avisos_suscripciones").delete().eq("endpoint", s.endpoint); await s.unsubscribe(); }
    setOcupado(false); setEstado("apagado");
  }

  return (
    <section className="box">
      <h2>Avisos en este celular</h2>
      {estado === "cargando" && <p className="small muted">Cargando…</p>}
      {estado === "activo" && <>
        <p className="small">Activados: cada vez que alguien completa el formulario «Quiero probarlo» te llega una notificación.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn dark sm" disabled={ocupado} onClick={probar}>Probar</button>
          <button className="x" disabled={ocupado} onClick={desactivar}>Desactivar</button>
        </div></>}
      {estado === "apagado" && <>
        <p className="small muted">Activalos y te llega una notificación cada vez que alguien completa el formulario «Quiero probarlo». Se activan en cada celular por separado.</p>
        <button className="btn dark sm" style={{ alignSelf: "flex-start" }} disabled={ocupado} onClick={activar}>{ocupado ? "Activando…" : "Activar avisos"}</button></>}
      {estado === "ios_instalar" && <p className="small muted">En iPhone los avisos llegan solo a la app de la pantalla de inicio. Tocá <b>Compartir</b> → <b>Agregar a inicio</b>, abrí Administración desde ese ícono y activalos acá.</p>}
      {estado === "bloqueado" && <p className="small muted">Las notificaciones están bloqueadas para De la Casa. Habilitalas en los ajustes del celular (o del navegador) y volvé a entrar.</p>}
      {estado === "sin_soporte" && <p className="small muted">Este navegador no puede recibir avisos. En Android usá Chrome; en iPhone, Administración desde el ícono de la pantalla de inicio.</p>}
      {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
    </section>
  );
}
