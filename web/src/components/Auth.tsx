"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { sb } from "@/lib/supabase";
import { msg } from "@/lib/util";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setCargando(false); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, cargando };
}

function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) setErr(msg(error));
    setOcupado(false);
  }
  return (
    <form className="box" onSubmit={entrar}>
      <h2>Ingresar</h2>
      <label>Mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} /></label>
      {err && <div className="errmsg">{err}</div>}
      <button className="btn dark" disabled={ocupado}>Entrar</button>
    </form>
  );
}

/** Segundo factor (app autenticadora). Obligatorio para el superadmin. */
function Mfa({ onListo }: { onListo: () => void }) {
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: f } = await sb.auth.mfa.listFactors();
      const existente = f?.totp?.[0];
      if (existente) { setFactorId(existente.id); return; }
      // Si quedó un intento de alta sin verificar, se descarta y se crea uno nuevo.
      for (const x of f?.all ?? []) if (x.status === "unverified") await sb.auth.mfa.unenroll({ factorId: x.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
      if (error) { setErr(msg(error)); return; }
      setFactorId(data.id); setQr(data.totp.qr_code); setSecreto(data.totp.secret);
    })();
  }, []);

  async function verificar(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: codigo.trim() });
    if (error) setErr("Código incorrecto. Probá con el que muestra la app ahora."); else onListo();
  }
  return (
    <form className="box" onSubmit={verificar}>
      <h2>Verificación en dos pasos</h2>
      {qr ? (<>
        <p className="small muted">Escaneá este código con Google Authenticator, Authy o similar, y escribí el código de 6 dígitos.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR para la app autenticadora" width={180} height={180} style={{ alignSelf: "center", background: "#fff", borderRadius: 8 }} />
        <p className="small muted">¿No podés escanear? Clave: <code>{secreto}</code></p>
      </>) : <p className="small muted">Escribí el código de 6 dígitos de tu app autenticadora.</p>}
      <label>Código<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={codigo} onChange={(e) => setCodigo(e.target.value)} /></label>
      {err && <div className="errmsg">{err}</div>}
      <button className="btn dark" disabled={!factorId}>Verificar</button>
    </form>
  );
}

export function RequireAuth({ mfa = false, children }: { mfa?: boolean; children: (s: Session) => ReactNode }) {
  const { session, cargando } = useSession();
  const [nivel, setNivel] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !mfa) return;
    sb.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setNivel(data?.currentLevel ?? "aal1"));
  }, [session, mfa]);

  if (cargando) return <p className="muted">Cargando…</p>;
  if (!session) return <Login />;
  if (mfa && nivel !== "aal2") {
    if (nivel === null) return <p className="muted">Cargando…</p>;
    return <Mfa onListo={async () => { await sb.auth.refreshSession(); setNivel("aal2"); }} />;
  }
  return (<>
    {children(session)}
    <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => sb.auth.signOut()}>Cerrar sesión</button>
  </>);
}
