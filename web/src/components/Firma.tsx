// "Desarrollado por Fabrizio Turdó" al pie: abre su WhatsApp con un mensaje ya escrito.
// En la tarjeta lo ve el cliente, que puede ser dueño de otro negocio.
export const WHATSAPP_FABRI = "5491154922800";

export const linkWhatsapp = (texto: string) => `https://wa.me/${WHATSAPP_FABRI}?text=${encodeURIComponent(texto)}`;

export function Firma({ mensaje = "¡Hola, Fabrizio! Vi De la Casa y quiero saber más para mi negocio." }: { mensaje?: string }) {
  return (
    <p className="firma small muted">
      Desarrollado por <a href={linkWhatsapp(mensaje)} target="_blank" rel="noopener noreferrer">Fabrizio Turdó</a>
    </p>
  );
}
