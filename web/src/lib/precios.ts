// Precios de la página pública. Si cambian, actualizar también public/llms.txt.
// El cupo de fundadores también está en la base (lugares_fundadores y marcar_fundador, migración 0007).
export const PRECIO = "$20.000";
export const PRECIO_FUNDADOR = "$10.000";
export const CUPO_FUNDADORES = 10;

/**
 * Links de los planes de suscripción de Mercado Pago (cuenta de Fabri → Planes de suscripción → "Copiar link").
 * No son secretos: abren el checkout de Mercado Pago, donde el negocio pone su tarjeta (nunca pasa por De la Casa).
 * Vacío: el cartel del panel ofrece escribir por WhatsApp en lugar del botón de pago.
 */
export const LINK_SUSCRIPCION = {
  general: "https://mpago.la/31YR3ET", // plan "delacasa", $20.000 por mes, sin fin
  fundador: "https://mpago.la/11kNcQm", // plan "delacasa fundador", $10.000 por mes, sin fin (a los 6 meses se sube el monto)
};
