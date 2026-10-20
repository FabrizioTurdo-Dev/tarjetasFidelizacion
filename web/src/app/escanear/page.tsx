"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { RequireAuth } from "@/components/Auth";
import { sb } from "@/lib/supabase";
import { negociosDelUsuario, type NegocioUsuario } from "@/lib/negocios";
import { iniciales, marca, msg, socio, type EstadoCliente } from "@/lib/util";

type Resp = { registrada?: boolean; reinicio?: boolean; motivo?: string; proxima?: string; cliente: EstadoCliente };

/** El QR trae el link de la tarjeta (…/t/?k=TOKEN); también se acepta el token pelado. */
const sacarToken = (txt: string) => {
  try { const k = new URL(txt).searchParams.get("k"); if (k) return k; } catch { /* no era un link */ }
  return /^[0-9a-f]{32,64}$/i.test(txt.trim()) ? txt.trim() : "";
};
/** Número de socio escrito a mano: "42", "0042" o "#0042". */
const sacarNumero = (txt: string) => {
  const m = /^#?\s*(\d{1,6})$/.exec(txt.trim());
  return m ? parseInt(m[1], 10) : 0;
};

function Escanear({ uid }: { uid: string }) {
  const [negocios, setNegocios] = useState<NegocioUsuario[]>([]);
  const [negId, setNegId] = useState("");
  const [token, setToken] = useState("");
  const [res, setRes] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [camara, setCamara] = useState(true);
  const [manual, setManual] = useState("");
  const [buscado, setBuscado] = useState<{ token: string; cliente: EstadoCliente } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const trabajando = useRef(false);

  useEffect(() => {
    negociosDelUsuario(uid).then((l) => { setNegocios(l); if (l[0]) setNegId(l[0].id); });
  }, [uid]);
  const neg = negocios.find((n) => n.id === negId);

  const sumar = useCallback(async (t: string) => {
    if (trabajando.current) return;
    trabajando.current = true; setOcupado(true); setErr(""); setRes(null); setBuscado(null); setToken(t);
    const { data, error } = await sb.rpc("registrar_visita", { p_token: t });
    if (error) setErr(msg(error)); else setRes(data as Resp);
    setOcupado(false); trabajando.current = false;
  }, []);

  // Cámara + lectura del QR
  useEffect(() => {
    if (!camara) return;
    let stop = false, stream: MediaStream | null = null, raf = 0;
    const canvas = document.createElement("canvas");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop || !video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const tick = () => {
          const v = video.current;
          if (stop || !v) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA && !trabajando.current) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            const t = code ? sacarToken(code.data) : "";
            if (t) { setCamara(false); sumar(t); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch { setErr("No pudimos abrir la cámara. Revisá el permiso o escribí el número de socio abajo."); setCamara(false); }
    })();
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()); };
  }, [camara, sumar]);

  async function canjear(premioId: string) {
    setOcupado(true); setErr("");
    const { data, error } = await sb.rpc("canjear_premio", { p_token: token, p_premio_id: premioId });
    if (error) setErr(msg(error)); else setRes((r) => (r ? { ...r, cliente: data as EstadoCliente } : r));
    setOcupado(false);
  }
  function otro() { setRes(null); setErr(""); setToken(""); setBuscado(null); setManual(""); setCamara(true); }

  // Sin cámara: con un link se suma directo; con un número primero se muestra de quién es, para no equivocarse.
  async function aMano(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const t = sacarToken(manual);
    if (t) { setCamara(false); sumar(t); return; }
    const num = sacarNumero(manual);
    if (!num) { setErr("Escribí el número de socio que figura en la tarjeta del cliente (por ejemplo, 42)."); return; }
    setOcupado(true); setCamara(false);
    const { data, error } = await sb.rpc("buscar_socio", { p_negocio: negId, p_numero: num });
    setOcupado(false);
    if (error) setErr(msg(error)); else setBuscado(data as { token: string; cliente: EstadoCliente });
  }

  const c = res?.cliente;
  const pendientes = c?.premios.filter((p) => p.ganado && !p.canjeado) ?? [];
  const siguiente = c?.premios.filter((p) => !p.ganado).sort((a, b) => a.visitas - b.visitas)[0];

  return (
    <div style={neg ? marca(neg.color) : undefined} className="screen" >
      <div className="top">
        <div className="biz"><div className="logo" style={{ width: 36, height: 36, fontSize: 15, borderRadius: 9 }}>{iniciales(neg?.nombre || "")}</div><strong>{neg?.nombre}</strong></div>
        {negocios.length > 1 && <select value={negId} onChange={(e) => setNegId(e.target.value)}>{negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>}
      </div>
      <div className="links">
        {neg?.rol === "dueno" && <Link href="/panel/">← Panel del negocio</Link>}
        <Link href="/guia/">Cómo se usa</Link>
      </div>

      {camara && <div className="cam"><video ref={video} playsInline muted /><div className="frame" /></div>}
      {camara && <p className="small muted" style={{ textAlign: "center" }}>Apuntá al QR de la tarjeta del cliente</p>}
      {ocupado && <p className="muted">{buscado || token ? "Registrando…" : "Buscando…"}</p>}
      {err && <div className="errmsg">{err}</div>}

      {c && res && (
        <div className={"result " + (res.registrada === false ? "r-warn" : pendientes.length ? "r-prize" : "r-good")} aria-live="polite">
          <span className="who">{c.nombre} · socio {socio(c.numero_socio)}</span>
          {res.registrada === false
            ? <><h2>Ya sumó una visita hace poco</h2><p>Puede sumar otra desde las {new Date(res.proxima!).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}. No se sumó nada.</p></>
            : <><h2>Visita sumada: {c.visitas}</h2>
              {res.reinicio && <p>Pasó más tiempo del permitido sin visitas, así que el contador volvió a empezar. Esta visita ya cuenta.</p>}
              {!pendientes.length && <p>{siguiente ? `Le ${siguiente.visitas - c.visitas === 1 ? "falta 1" : "faltan " + (siguiente.visitas - c.visitas)} para: ${siguiente.nombre}.` : "Ya llegó al premio máximo."}</p>}</>}
          {pendientes.map((p) => (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p>¡Tiene un premio! <b>{p.nombre}</b> ({p.visitas} visitas)</p>
              <button className="btn" disabled={ocupado} onClick={() => canjear(p.id)}>Entregar premio</button>
            </div>))}
          {pendientes.length > 0 && <p className="small">Si no lo quiere canjear ahora, queda disponible en su tarjeta.</p>}
        </div>
      )}
      {buscado && !res && (
        <div className="result r-prize" aria-live="polite">
          <span className="who">Socio {socio(buscado.cliente.numero_socio)} · {buscado.cliente.visitas} {buscado.cliente.visitas === 1 ? "visita" : "visitas"}</span>
          <h2>¿Es {buscado.cliente.nombre}?</h2>
          <p>Confirmá con el cliente antes de sumar.</p>
          <button className="btn" disabled={ocupado} onClick={() => sumar(buscado.token)}>Sí, sumar visita</button>
          <button className="btn ghost" onClick={otro}>No, cancelar</button>
        </div>
      )}
      {(res || err) && <button className="btn dark" onClick={otro}>Escanear otra tarjeta</button>}

      {!res && !buscado && (
        <form className="box" onSubmit={aMano}>
          <h2>¿No anda la cámara?</h2>
          <label>Número de socio<input inputMode="numeric" autoComplete="off" placeholder="Ej.: 42" value={manual} onChange={(e) => setManual(e.target.value)} /></label>
          <p className="small muted">Está en la tarjeta del cliente, arriba a la derecha (Socio #0042). También podés pegar el link de la tarjeta.</p>
          <button className="btn ghost" disabled={ocupado || !negId}>Buscar socio</button>
        </form>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <main className="screen">
      <h1>Escanear</h1>
      <RequireAuth>{(s) => <Escanear uid={s.user.id} />}</RequireAuth>
    </main>
  );
}
