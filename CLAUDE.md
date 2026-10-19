# Contexto del proyecto (leer primero)

Este archivo resume todo lo decidido antes de empezar a programar. Claude Code lo lee
automáticamente al abrir esta carpeta, así cualquier conversación nueva arranca con el contexto.

## Qué es
SaaS de tarjeta de fidelización (cliente frecuente) virtual para comercios y servicios de Argentina.
El cliente final la tiene en el celular sin descargar apps; el negocio la administra desde un panel web
(PWA) y paga una suscripción mensual.

- Nombre: a definir entre **Habitué** y **De la Casa**.
- Idioma de la interfaz: español rioplatense (voseo).
- Documentos detallados: `docs/plan-mvp.md` y `docs/propuesta-comercios.md`.

## Decisiones tomadas (19/10/2026)
| Tema | Decisión |
| --- | --- |
| Programa | Solo por visitas (sellos). Puntos por monto: versión 2 |
| Período de espera entre visitas | 6 horas (configurable por negocio) |
| Vencimiento | Por inactividad: si pasan 60 días sin visitas, el contador se reinicia y la visita nueva cuenta como 1. Cada visita reinicia el plazo de 60 días |
| Aviso de vencimiento | La tarjeta muestra cuándo vencen las visitas; recordatorio 7 días antes |
| Android | Google Wallet (cuenta de emisor gratis; arranca en modo demo) |
| iPhone | Tarjeta web con link secreto, guardada en la pantalla de inicio. Tutorial automático al abrirla desde iPhone (Compartir → Agregar a inicio). Apple Wallet con cuenta propia en versión 2 |
| Alta de negocios | Manual, la hace el superadmin con los datos que pasa el negocio |
| Prueba gratis | 30 días desde el alta |
| Cobro en el MVP | Manual (transferencia o link de pago). Mercado Pago automático: versión 2 |
| Tecnología | Next.js + Supabase (Auth, Postgres con RLS) |
| Pilotos | almadekh (restaurante); buscar 2 más de otros rubros |

## Alcance del MVP
1. Alta del cliente final: QR del negocio → formulario corto (nombre, teléfono o mail, cumpleaños opcional, acepta privacidad) → número de socio correlativo por negocio (#0001…).
2. Tarjeta: Google Wallet + tarjeta web (logo, colores, visitas, socio, QR, premios, vencimiento).
3. Sumar visita: solo un usuario logueado del negocio escanea el QR del cliente. Se respeta el período de espera. Todo queda auditado (quién, cuándo).
4. Canje de premio: el empleado escanea y canjea; se descuentan visitas y queda registrado.
5. Panel del negocio (PWA): roles dueño / empleado. Lista de clientes, última visita, dormidos (+30 días), top 10, visitas por día, canjes, cumpleaños del mes.
6. Panel superadmin: alta manual de negocios, estado (prueba / activa / vencida / suspendida), días de prueba restantes.

## Reglas de seguridad (no negociables)
- RLS activado en todas las tablas; cada negocio ve solo sus datos.
- Login con Supabase Auth, nunca a mano. 2FA para el superadmin.
- El QR / link de la tarjeta usa un token largo y aleatorio, nunca el número de socio.
- Secretos solo en variables de entorno (`.env.local`, que no se sube a git).
- Datos mínimos del cliente final (sin DNI). Ley 25.326 de datos personales.
- Si más adelante hay cobros: checkout de Mercado Pago, verificar firma de webhooks y consultar el estado real a la API.

## Importante sobre Supabase
- La cuenta de Supabase conectada por MCP al 19/10/2026 es de **un cliente de Fabri**, no de este proyecto. **No usarla ni crear nada ahí.**
- La base de datos de este proyecto se crea cuando Fabri conecte su propia cuenta. Mientras tanto, el prototipo usa datos de ejemplo.

## Estructura actual y GitHub Pages
- Repo: https://github.com/FabrizioTurdo-Dev/tarjetasFidelizacion — publicado con GitHub Pages (rama main, carpeta raíz).
- `index.html`: tablero de avance y control de comercios. Lee `data/tareas.json` y `data/comercios.json`.
  - Para actualizarlo se editan esos JSON. Estados de tareas: Pendiente, En curso, Hecho. Estados de comercios: Contactado, Interesado, Faltan datos, Datos recibidos, Habilitado, Pagando, Descartado. `inicio` en formato AAAA-MM-DD; la prueba dura 30 días.
  - El repo es público: en `data/comercios.json` NO van teléfonos, mails ni datos personales. Eso va en `privado/contactos.md` (en .gitignore).
- `prototipo/`: pantallas estáticas con datos de ejemplo ("Café Lunar"): alta, tarjeta (con tutorial de iPhone), escanear, panel del dueño. Estilos compartidos en `prototipo/estilos.css`; `--marca` es el color del comercio.
- GitHub Pages solo sirve archivos estáticos. La app real (Next.js + Supabase) se publicará en otro lado (por ejemplo, Vercel); Pages queda para el tablero y el prototipo.
