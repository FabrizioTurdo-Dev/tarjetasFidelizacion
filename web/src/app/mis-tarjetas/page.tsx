"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Firma } from "@/components/Firma";
import { sb } from "@/lib/supabase";
import { BASE, esIos, iniciales, marca, socio, type EstadoCliente } from "@/lib/util";
import { agregarToken, quitarToken, tokensDeTexto, tokensGuardados } from "@/lib/tarjetas";
import { ManifestCliente } from "@/components/Instalar";

type Item = { token: string; c: EstadoCliente | null };

function Mis() {
  const q = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [pegado, setPegado] = useState("");
  const [err, setErr] = useState("");

  const cargar = useCallback(async () => {
    const tokens = tokensGuardados();
    // Con todos los tokens en la dirección, si guardan esta pantalla en el inicio queda con todas las tarjetas.
    try { history.replaceState(null, "", `${BASE}/mis-tarjetas/${tokens.length ? "?k=" + tokens.join(",") : ""}`); } catch { /* nada */ }
    const res = await Promise.all(tokens.map(async (token) => {
      const { data, error } = await sb.rpc("tarjeta_por_token", { p_token: token });
      return { token, c: error ? null : (data as EstadoCliente) };
    }));
    setItems(res);
    return res;
  }, []);

  useEffect(() => {
    tokensDeTexto(q.get("k") || "").forEach(agregarToken); // tarjetas que vienen en el link
    // ?inicio=1 es la dirección del ícono de Android: con una sola tarjeta, se abre directo.
    const inicio = q.has("inicio");
    cargar().then((res) => {
      const ok = res.filter((x) => x.c);
      if (inicio && ok.length === 1) router.replace(`/t/?k=${ok[0].token}`);
    });
  }, [q, cargar, router]);

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    const t = tokensDeTexto(pegado);
    if (!t.length) { setErr("Ese link no parece una tarjeta."); return; }
    t.forEach(agregarToken); setPegado(""); setErr(""); cargar();
  }

  const ios = esIos();

  return (
    <main className="screen">
      <h1>Mis tarjetas</h1>
      {items === null && <p className="muted">Cargando…</p>}
      {items && !items.length && <div className="aviso">Todavía no hay tarjetas en este dispositivo. Escaneá el QR de un negocio para crear la primera.</div>}

      {items?.map(({ token, c }) => c ? (
        <Link key={token} href={`/t/?k=${token}`} style={{ ...marca(c.negocio.color), textDecoration: "none" }}>
          <div className="mini">
            <div className="biz"><div className="logo">{iniciales(c.negocio.nombre)}</div>
              <div style={{ flex: 1 }}><strong>{c.negocio.nombre}</strong><p className="small" style={{ opacity: .85 }}>Socio {socio(c.numero_socio)}</p></div>
              <div className="count" style={{ fontSize: 30 }}>{c.visitas} <small>{c.visitas === 1 ? "visita" : "visitas"}</small></div></div>
            {(() => {
              const listo = c.premios.filter((p) => p.ganado && !p.canjeado);
              const sig = [...c.premios].sort((a, b) => a.visitas - b.visitas).find((p) => !p.ganado);
              return <p className="small" style={{ opacity: .9 }}>{listo.length ? `¡Premio listo!: ${listo[0].nombre}` : sig ? `Te faltan ${sig.visitas - c.visitas} para: ${sig.nombre}` : "Premio máximo alcanzado"}</p>;
            })()}
          </div>
        </Link>
      ) : (
        <div key={token} className="box"><p className="small muted">Una tarjeta ya no está disponible.</p>
          <button className="btn ghost sm" onClick={() => { quitarToken(token); cargar(); }}>Quitarla de la lista</button></div>
      ))}

      {!!items?.length && (
        <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => {
          if (confirm("Esto saca las tarjetas de la lista de este dispositivo. No las borra: podés volver a abrirlas desde su link.")) { tokensGuardados().forEach(quitarToken); cargar(); }
        }}>Vaciar la lista</button>
      )}

      {ios && !!items?.length && (
        <section className="box"><h2>Todas en un solo ícono</h2>
          <p className="small muted">En Safari tocá <b>Compartir</b> → <b>Agregar a inicio</b> desde <b>esta</b> pantalla. Así el ícono De la Casa abre todas tus tarjetas.</p></section>
      )}

      <form className="box" onSubmit={agregar}>
        <h2>Agregar una tarjeta</h2>
        <p className="small muted">{ios
          ? "En iPhone, el ícono de la pantalla de inicio no ve las tarjetas que abrís en Safari. Abrí la tarjeta nueva, tocá \"Copiar link\" y pegalo acá."
          : "Abrí la tarjeta nueva, tocá \"Copiar link\" y pegalo acá."}</p>
        <label>Link de la tarjeta<input value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder="https://…/t/?k=…" /></label>
        {err && <div className="errmsg">{err}</div>}
        <button className="btn dark">Agregar</button>
      </form>
      <Firma />
    </main>
  );
}

export default function Page() { return <><ManifestCliente /><Suspense><Mis /></Suspense></>; }
