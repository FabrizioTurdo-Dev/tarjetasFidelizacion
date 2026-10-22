"use client";
import { diasPrueba, linkWa, type Negocio } from "@/lib/util";

// Resumen general del superadmin (función resumen_admin): totales y una fila por negocio,
// para ver rápido quién usa la tarjeta y a quién hay que llamar.
export type FilaResumen = Pick<Negocio, "id" | "nombre" | "slug" | "estado" | "inicio_prueba" | "rubro"> & {
  clientes: number; clientes_30: number; visitas_30: number; canjes_30: number;
  ultima_visita: string | null;
  premios: { visitas: number; nombre: string; activo: boolean }[];
  ultimo_cambio: { fecha: string; email: string | null; accion: string } | null;
  contacto_nombre: string | null; contacto_whatsapp: string | null;
};
export type DatosResumen = {
  negocios: FilaResumen[];
  clientes_total: number; clientes_30: number; visitas_30: number; canjes_30: number; solicitudes_nuevas: number;
};

export const ESTADO: Record<string, [string, string]> = {
  prueba: ["c-warn", "En prueba"], activa: ["c-good", "Activa"], vencida: ["c-bad", "Vencida"],
  suspendida: ["c-bad", "Suspendida"], cancelada: ["c-neutral", "Cancelada"],
};

const DIA = 864e5;
const fecha = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-AR") : "—");
const diasDesde = (s: string | null) => (s ? Math.floor((Date.now() - new Date(s).getTime()) / DIA) : null);

export function Resumen({ datos, onAbrir, onSolicitudes }: {
  datos: DatosResumen | null;
  onAbrir: (id: string) => void;
  onSolicitudes: () => void;
}) {
  if (!datos) return <p className="muted">Cargando…</p>;
  const l = datos.negocios;
  const cuenta = (e: string) => l.filter((n) => n.estado === e).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="kpis">
        <div className="kpi"><b>{cuenta("prueba")}</b><span>En prueba</span></div>
        <div className="kpi"><b>{cuenta("activa")}</b><span>Activos</span></div>
        <div className="kpi"><b>{cuenta("vencida") + cuenta("suspendida")}</b><span>Vencidos o suspendidos</span></div>
        <div className="kpi"><b>{datos.clientes_total}</b><span>Clientes con tarjeta · {datos.clientes_30} nuevos en 30 días</span></div>
        <div className="kpi"><b>{datos.visitas_30}</b><span>Visitas (30 días)</span></div>
        <div className="kpi"><b>{datos.canjes_30}</b><span>Premios entregados (30 días)</span></div>
        <button className="kpi" style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", borderColor: datos.solicitudes_nuevas ? "var(--warn)" : undefined }} onClick={onSolicitudes}>
          <b>{datos.solicitudes_nuevas}</b><span>Solicitudes sin contestar →</span></button>
      </div>

      <section className="box"><h2>Negocios</h2>
        <p className="small muted">"Sin uso" marca a los que no registran visitas hace más de 14 días: son a los que conviene escribirles.</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Negocio</th><th>Clientes</th><th>Visitas 30 d</th><th>Canjes 30 d</th><th>Última visita</th><th>Premios</th><th>Último cambio de premios</th><th>Dueño</th></tr></thead>
            <tbody>{l.map((n) => {
              const e = ESTADO[n.estado]; const d = diasPrueba(n); const sin = diasDesde(n.ultima_visita);
              return (
                <tr key={n.id}>
                  <td><button className="x" style={{ padding: "4px 10px", textAlign: "left" }} onClick={() => onAbrir(n.id)}><strong>{n.nombre}</strong></button>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      <span className={"chip " + e[0]}>{e[1]}{n.estado === "prueba" ? ` · ${d > 0 ? `${d} d` : "terminó"}` : ""}</span>
                      {(sin === null || sin > 14) && <span className="chip c-bad">Sin uso</span>}
                    </div></td>
                  <td>{n.clientes}{n.clientes_30 ? <span className="small muted"> (+{n.clientes_30})</span> : null}</td>
                  <td>{n.visitas_30}</td>
                  <td>{n.canjes_30}</td>
                  <td>{fecha(n.ultima_visita)}</td>
                  <td className="small">{n.premios.length ? n.premios.map((p) => <div key={p.visitas} style={{ opacity: p.activo ? 1 : .5 }}>{p.visitas}: {p.nombre}{p.activo ? "" : " (pausado)"}</div>) : <span className="muted">Sin premios</span>}</td>
                  <td className="small">{n.ultimo_cambio ? <>{fecha(n.ultimo_cambio.fecha)}<div className="muted" style={{ wordBreak: "break-all" }}>{n.ultimo_cambio.email}</div></> : <span className="muted">—</span>}</td>
                  <td className="small">{n.contacto_whatsapp
                    ? <a href={linkWa(n.contacto_whatsapp, `¡Hola${n.contacto_nombre ? " " + n.contacto_nombre : ""}! Soy Fabrizio, de De la Casa. ¿Cómo viene la tarjeta en ${n.nombre}?`)} target="_blank" rel="noopener noreferrer">{n.contacto_nombre || "WhatsApp"}</a>
                    : <span className="muted">Sin cargar</span>}</td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
