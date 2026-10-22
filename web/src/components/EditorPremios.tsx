"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { msg } from "@/lib/util";

// Escalera de premios de un negocio. La usan el dueño (panel) y el superadmin (Administración).
// Se guarda toda junta con guardar_premios: la base decide si un premio quitado se borra o se archiva
// (si ya se canjeó) y deja cada cambio en el historial.
export type PremioEd = { id?: string; visitas: number; nombre: string; activo: boolean };

const MAX_ACTIVOS = 10;

export function EditorPremios({ negocioId, inicial, visitasClientes, demo = false, onGuardado }: {
  negocioId: string;
  inicial: PremioEd[];
  /** Visitas vigentes de cada cliente, para avisar a cuántos afecta subir las visitas de un premio. */
  visitasClientes?: number[];
  demo?: boolean;
  onGuardado?: (premios: PremioEd[]) => void;
}) {
  const [premios, setPremios] = useState<PremioEd[]>(inicial);
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { setPremios(inicial); setAviso(null); }, [inicial]);

  const cambiar = (i: number, p: Partial<PremioEd>) => setPremios(premios.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const original = (id?: string) => inicial.find((x) => x.id === id);

  // Subir las visitas de un premio deja esperando a los clientes que estaban cerca o ya lo tenían.
  const afectados = (p: PremioEd) => {
    const o = original(p.id);
    if (!o || !visitasClientes || p.visitas <= o.visitas) return 0;
    return visitasClientes.filter((v) => v >= Math.max(1, o.visitas - 2) && v < p.visitas).length;
  };

  async function guardar() {
    setAviso(null);
    if (premios.some((p) => !p.nombre.trim() || p.visitas < 1 || p.visitas > 500)) { setAviso({ ok: false, t: "Cada premio necesita un nombre y entre 1 y 500 visitas." }); return; }
    if (new Set(premios.map((p) => p.visitas)).size !== premios.length) { setAviso({ ok: false, t: "Dos premios no pueden pedir la misma cantidad de visitas." }); return; }
    if (premios.filter((p) => p.activo).length > MAX_ACTIVOS) { setAviso({ ok: false, t: `Podés tener hasta ${MAX_ACTIVOS} premios activos.` }); return; }
    if (demo) { setAviso({ ok: false, t: "Estás en la vista demo: no se guarda nada." }); return; }
    setOcupado(true);
    const lista = premios.map((p) => ({ ...(p.id ? { id: p.id } : {}), visitas: p.visitas, nombre: p.nombre.trim(), activo: p.activo }));
    const { error } = await sb.rpc("guardar_premios", { p_negocio: negocioId, p_premios: lista });
    if (error) { setOcupado(false); setAviso({ ok: false, t: msg(error) }); return; }
    const { data } = await sb.from("premios").select("id,visitas,nombre,activo").eq("negocio_id", negocioId).is("archivado_at", null).order("visitas");
    setOcupado(false);
    const nuevos = (data as PremioEd[]) ?? [];
    onGuardado?.(nuevos);
    setAviso({ ok: true, t: "Premios guardados. Tus clientes ya los ven en su tarjeta." });
  }

  const hayCambios = JSON.stringify(premios) !== JSON.stringify(inicial);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {premios.map((p, i) => {
        const n = afectados(p);
        return (
          <div key={p.id ?? "n" + i} style={{ display: "flex", flexDirection: "column", gap: 6, opacity: p.activo ? 1 : 0.6 }}>
            <div className="prem" style={{ gridTemplateColumns: "90px 1fr auto auto" }}>
              <label>Visitas<input type="number" min={1} max={500} value={p.visitas || ""} onChange={(e) => cambiar(i, { visitas: parseInt(e.target.value) || 0 })} /></label>
              <label>Premio<input value={p.nombre} maxLength={80} placeholder="Café con medialuna" onChange={(e) => cambiar(i, { nombre: e.target.value })} /></label>
              <button className="x" onClick={() => cambiar(i, { activo: !p.activo })} title={p.activo ? "Deja de mostrarse y no se puede canjear" : "Vuelve a mostrarse en la tarjeta"}>{p.activo ? "Pausar" : "Activar"}</button>
              <button className="x" aria-label="Quitar premio" onClick={() => setPremios(premios.filter((_, j) => j !== i))}>✕</button>
            </div>
            {!p.activo && <span className="small muted">Pausado: no se muestra en la tarjeta ni se puede canjear.</span>}
            {n > 0 && <span className="aviso">{n === 1 ? "1 cliente tiene" : `${n} clientes tienen`} entre {Math.max(1, (original(p.id)?.visitas ?? 1) - 2)} y {p.visitas - 1} visitas: si subís este premio a {p.visitas}, van a tener que esperar más para ganarlo.</span>}
          </div>);
      })}
      {!premios.length && <p className="muted small">Todavía no hay premios. Sumá el primero: por ejemplo, a las 5 visitas, un café.</p>}
      <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} disabled={premios.filter((p) => p.activo).length >= MAX_ACTIVOS}
        onClick={() => setPremios([...premios, { visitas: Math.max(0, ...premios.map((p) => p.visitas)) + 5, nombre: "", activo: true }])}>+ Agregar premio</button>
      <p className="small muted">Las visitas no se descuentan al canjear: cada premio se entrega una vez. Si quitás un premio que alguien ya canjeó, queda guardado en el historial. El premio nunca puede ser a cambio de una reseña en Google.</p>
      {aviso && <div className={aviso.ok ? "okmsg" : "errmsg"}>{aviso.t}</div>}
      {hayCambios && <button className="btn dark" disabled={ocupado} onClick={guardar}>{ocupado ? "Guardando…" : "Guardar premios"}</button>}
    </div>
  );
}
