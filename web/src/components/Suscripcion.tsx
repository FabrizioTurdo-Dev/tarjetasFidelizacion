import { linkWhatsapp } from "@/components/Firma";
import { LINK_SUSCRIPCION, PRECIO, PRECIO_FUNDADOR } from "@/lib/precios";
import { diasPrueba, type Negocio } from "@/lib/util";

// Cartel del panel para pasar de la prueba a la suscripción (Mercado Pago).
// Aparece 7 días antes de que termine la prueba (al terminar, la base deja de sumar visitas: app.negocio_operativo),
// y si la cuenta quedó vencida o suspendida. Por ahora Fabri pasa el negocio a "activa" a mano cuando ve el pago.
const AVISAR_DESDE = 7;

export function AvisoSuscripcion({ negocio }: { negocio: Negocio }) {
  if (negocio.interno || negocio.estado === "activa" || negocio.estado === "cancelada") return null;
  const d = diasPrueba(negocio);
  if (negocio.estado === "prueba" && d > AVISAR_DESDE) return null;

  const titulo = negocio.estado === "vencida" ? "No registramos el pago de este mes"
    : negocio.estado === "suspendida" ? "Tu cuenta está suspendida"
    : d > 1 ? `Tu prueba termina en ${d} días` : d === 1 ? "Tu prueba termina mañana" : d === 0 ? "Tu prueba termina hoy" : "Tu prueba terminó";
  const cortado = negocio.estado === "suspendida" || (negocio.estado === "prueba" && d < 0);
  const link = negocio.fundador ? LINK_SUSCRIPCION.fundador : LINK_SUSCRIPCION.general;
  const consulta = linkWhatsapp(`¡Hola, Fabrizio! Te escribo desde ${negocio.nombre} por la suscripción de De la Casa: `);

  return (
    <section className={cortado ? "box suscripcion corte" : "box suscripcion"}>
      <h2>{titulo}</h2>
      <p className="small">
        {cortado ? "Tus clientes no pueden sumar visitas hasta que actives la suscripción. Sus tarjetas y visitas siguen guardadas."
          : negocio.estado === "vencida" ? "Tus clientes siguen sumando visitas unos días más. Regularizalo para que no se corte."
          : "Para que tus clientes sigan sumando visitas, activá tu suscripción."}
      </p>
      <p className="small">
        {negocio.fundador ? <><b>{PRECIO_FUNDADOR} por mes</b> durante 6 meses (tu precio de socio fundador); después, {PRECIO}.</>
          : <><b>{PRECIO} por mes</b>, todo incluido y sin límite de clientes.</>}
        {" "}Se paga con Mercado Pago y sin permanencia: la cancelás cuando quieras desde tu cuenta de Mercado Pago.
      </p>
      {link
        ? <a className="btn" href={link} target="_blank" rel="noopener noreferrer">Activar suscripción</a>
        : <a className="btn" href={consulta} target="_blank" rel="noopener noreferrer">Escribinos para activarla</a>}
      <p className="small muted">{link ? <>Cuando pagues, la activamos en el día. ¿Dudas? <a href={consulta} target="_blank" rel="noopener noreferrer">Escribinos</a>.</> : "Te pasamos el link de pago por WhatsApp."}</p>
    </section>
  );
}
