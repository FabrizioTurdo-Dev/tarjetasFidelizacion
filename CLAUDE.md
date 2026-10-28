# Contexto del proyecto (leer primero)

Este archivo resume todo lo decidido antes de empezar a programar. Claude Code lo lee
automáticamente al abrir esta carpeta, así cualquier conversación nueva arranca con el contexto.

## Qué es
SaaS de tarjeta de fidelización (cliente frecuente) virtual para comercios y servicios de Argentina.
El cliente final la tiene en el celular sin descargar apps; el negocio la administra desde un panel web
(PWA) y paga una suscripción mensual.

- Nombre: **De la Casa**, dominio **delacasa.com.ar** (comprado en DomWeb). Decidido 22/10/2026; la app todavía dice "Habitué" hasta hacer el cambio.
- Idioma de la interfaz: español rioplatense (voseo).
- Documentos detallados: `docs/plan-mvp.md`, `docs/propuesta-comercios.md` y `docs/plan-lanzamiento.md` (plan vigente: dominio, premios editables, superadmin, página pública, cobro).

## Decisiones tomadas (19/10/2026)
| Tema | Decisión |
| --- | --- |
| Programa | Solo por visitas. Puntos por monto: versión 2 |
| Premios | Escalera por negocio (ej. 10 visitas: café, 20: torta, 100: cena). Visitas acumuladas: canjear NO las descuenta; cada premio se canjea una vez. El dueño los edita desde su panel (se adelantó, 22/10/2026): no se borra uno ya canjeado, se pausa; cada cambio queda en un historial que ve el superadmin. El superadmin sigue pudiendo editar todo. Visitas como moneda: con puntos, v2 |
| Período de espera entre visitas | 6 horas (configurable por negocio) |
| Vencimiento | Por inactividad: si pasan 60 días sin visitas, el contador se reinicia y la visita nueva cuenta como 1. Cada visita reinicia el plazo de 60 días |
| Aviso de vencimiento | La tarjeta muestra cuándo vencen las visitas. Recordatorio 7 días antes: versión 2 (decidido 20/10/2026) |
| Reseñas en Google | Botón en la tarjeta desde la 2ª visita, una sola vez, a todos por igual. Nunca a cambio de nada ni con texto prearmado (reglas de Google). El link lo carga el superadmin. Volver a pedirla a las 50 visitas: más adelante (decidido 21/10/2026) |
| Android | Google Wallet (cuenta de emisor gratis; arranca en modo demo). **En pausa** hasta tener ingresos (22/10/2026); mientras tanto, tarjeta web |
| iPhone | Tarjeta web con link secreto, guardada en la pantalla de inicio. Tutorial automático al abrirla desde iPhone (Compartir → Agregar a inicio). Apple Wallet con cuenta propia en versión 2 |
| Alta de negocios | El negocio pide la prueba en el formulario público (WhatsApp obligatorio); Fabri lo contacta y lo crea desde Administración (22/10/2026). Alta 100% autoservicio: más adelante |
| Prueba gratis | 30 días desde el alta |
| Cobro en el MVP | Primero link de suscripción de Mercado Pago creado a mano; después suscripciones automáticas con webhook (ver `docs/plan-lanzamiento.md`) |
| Precio | Un solo plan: $20.000 por mes, todo incluido y sin límite de clientes. Socios fundadores: los primeros 10 negocios que llegan por el formulario de la página y Fabri habilita pagan $10.000 por mes durante 6 meses. Los que Fabri crea a mano no cuentan. Sin costo de alta ni permanencia (decidido 26/10/2026) |
| Tecnología | Next.js + Supabase (Auth, Postgres con RLS) |
| Pilotos | almadekh (restaurante); buscar 2 más de otros rubros |

## Alcance del MVP
1. Alta del cliente final: QR del negocio → formulario corto (nombre, teléfono o mail, cumpleaños opcional, acepta privacidad) → número de socio correlativo por negocio (#0001…).
2. Tarjeta: Google Wallet + tarjeta web (logo, colores, visitas, socio, QR, premios, vencimiento).
3. Sumar visita: solo un usuario logueado del negocio escanea el QR del cliente. Se respeta el período de espera. Todo queda auditado (quién, cuándo).
4. Canje de premio: el empleado escanea y canjea; se descuentan visitas y queda registrado.
5. Panel del negocio (PWA): roles dueño / empleado. Lista de clientes, última visita, dormidos (+30 días), top 10, visitas por día, canjes, cumpleaños del mes.
6. Panel superadmin (solo Fabri): alta manual de negocios y edición de su tarjeta (nombre, color, premios, espera, vencimiento, empleados), estado (prueba / activa / vencida / suspendida), días de prueba restantes. Es prioridad: sin esto cada cambio requiere tocar código.

## Reglas de seguridad (no negociables)
- RLS activado en todas las tablas; cada negocio ve solo sus datos.
- Login con Supabase Auth, nunca a mano. 2FA para el superadmin.
- El QR / link de la tarjeta usa un token largo y aleatorio, nunca el número de socio.
- Secretos solo en variables de entorno (`.env.local`, que no se sube a git).
- Datos mínimos del cliente final (sin DNI). Ley 25.326 de datos personales.
- Si más adelante hay cobros: checkout de Mercado Pago, verificar firma de webhooks y consultar el estado real a la API.

## Importante sobre Supabase
- Hay dos Supabase conectados y conviven en paralelo:
  - **`tarjeta-fidelizacion`** (cuenta nueva de Fabri, ref `jswxklihzpbgbzezfnoi`, definido en `.mcp.json`): es la base de ESTE proyecto.
  - La conectada antes por MCP (tools `mcp__2f674ea8-…`) es de **un cliente de Fabri**. **No usarla ni crear nada ahí.**
- Antes de CUALQUIER cambio en una base de datos (migraciones, SQL, funciones, tablas), preguntar a Fabri y confirmar que el destino es `tarjeta-fidelizacion`. Nunca asumirlo.
- Fabri autentica el servidor con `claude /mcp` en una terminal normal. Hasta que lo haga, las tools de `tarjeta-fidelizacion` no están disponibles.

## Estructura actual y GitHub Pages
- Repo: https://github.com/FabrizioTurdo-Dev/tarjetasFidelizacion — publicado con GitHub Pages (rama main, carpeta raíz).
- `index.html` (raíz): redirige al prototipo, para poder pasarle el link a un comercio sin mostrar el tablero interno.
- `tablero/index.html`: tablero de avance y control de comercios (uso interno, en `/tablero/`). Lee `../data/tareas.json` y `../data/comercios.json`.
  - Para actualizarlo se editan esos JSON. Estados de tareas: Pendiente, En curso, Hecho. Estados de comercios: Contactado, Interesado, Faltan datos, Datos recibidos, Habilitado, Pagando, Descartado. `inicio` en formato AAAA-MM-DD; la prueba dura 30 días.
  - El repo es público: en `data/comercios.json` NO van teléfonos, mails ni datos personales. Eso va en `privado/contactos.md` (en .gitignore).
- `prototipo/`: pantallas estáticas con datos de ejemplo ("Café Lunar" y "Café Marte"): alta, tarjeta (con tutorial de iPhone), escanear, panel del dueño y `admin.html` (superadmin). Los datos comunes están en `prototipo/datos.js` (se guardan en localStorage del navegador; `?n=<id>` elige el negocio). Estilos compartidos en `prototipo/estilos.css`; `--marca` es el color del comercio.
- App real (`web/`): ícono de pantalla de inicio con manifiestos en `web/public/`: `manifest-negocio` (panel, escanear, guía; abre el panel y tiene atajo "Escanear"), `manifest-admin` y `manifest-cliente` (abre "Mis tarjetas"). El de clientes se agrega por JS y **nunca en iPhone**: allá el ícono tiene que guardar la dirección exacta con el token de la tarjeta, y su memoria está separada de Safari.
- La raíz de la app (`/`) es la página pública con el formulario "Quiero probarlo" (función `pedir_prueba`, tabla `solicitudes`, migración 0005). El `index.html` de la raíz del sitio redirige a `app/`.
  - Rediseño del 26/10/2026 (inspirado en sellala.com, sin copiarla): celular animado en la portada, cartón vs. De la Casa, demo para tocar (escáner + tarjeta, con la espera de 6 horas), panel de ejemplo, precios con socios fundadores y aviso flotante. Piezas en `components/landing/`; estilos `.l-*` en `globals.css`; precios en constantes de `app/page.tsx` (y en `llms.txt`).
  - Las maquetas muestran la tarjeta real de De la Casa (negocio interno `delacasa`, verde #2f5d50, premios a la 1, 2 y 7 visitas), no un negocio inventado. Si cambian en Administración, actualizar `components/landing/Tarjeta.tsx`. Colores de la página: ese verde, amarillo #f2b544 para resaltar y carbón #1b1816.
- Letra de toda la app (26/10/2026): Instrument Serif para títulos (`--display`, un solo peso; por eso `font-synthesis-weight:none`) e Inter Tight para textos (`--body`). IBM Plex Mono para datos.
  - Socios fundadores (migración 0007): un negocio es fundador si se crea desde una solicitud nueva ("Crear negocio" en Solicitudes) y quedan lugares; lo marca un trigger (`negocios.fundador`). Las solicitudes de antes de la 0007 tienen `para_fundador` false. `lugares_fundadores()` (pública) da los libres: la página los muestra, tacha los ocupados y esconde todo lo de fundadores al llegar a 0. Precios y cupo en `lib/precios.ts`.
  - Regla: la página muestra solo lo que la app hace hoy. No hay notificaciones al celular del cliente, así que no se muestran.
  - El compilador de CSS de Next descarta `translate`/`rotate` si la misma regla tiene `transform`: no mezclarlos.
- Premios: el dueño los edita en su panel y el superadmin en Administración, los dos con `guardar_premios` (componente `EditorPremios`). Un premio quitado se borra si nunca se canjeó y se archiva (`archivado_at`) si ya se canjeó; pausado = `activo` false. Cada cambio queda en `premios_cambios` (solo lo lee el superadmin).
- Bloque de información de la tarjeta ("Sobre nosotros" / "Quién está detrás"): título, texto y hasta 6 links https (un número de WhatsApp se convierte en link wa.me). Lo editan el dueño y el superadmin con `guardar_info` (componente `EditorInfo` en `components/Info.tsx`; migración 0006). Va debajo de los premios y no se muestra si está vacío. Los links a WhatsApp salen en verde con el logo. Foto: más adelante (necesita Storage).
- Campos de texto a 16px en pantallas táctiles: con menos, el iPhone hace zoom al tocarlos y la pantalla queda agrandada.
- `negocios.interno`: negocios de De la Casa (el de Fabri, demos). No suman en los totales de `resumen_admin` y se marcan "Interno".
- Administración tiene pestañas Resumen (función `resumen_admin`), Negocios y Solicitudes. El contacto del dueño y las notas van en `negocios_privado` (solo superadmin), nunca en `negocios`.
- SEO: solo se indexan `/`, `/guia/` y `/privacidad/` (el layout raíz pone noindex al resto). En `web/public/` están `robots.txt`, `sitemap.xml` (sumar ahí cada página pública nueva), `llms.txt` (resumen para asistentes de IA: mantenerlo al día con precios y funciones), `favicon.ico` y `og.png` (imagen para compartir). Canonical y Open Graph con `og()` de `lib/seo.ts`; datos estructurados (schema.org) en `app/page.tsx`.
- `/guia/` es la guía de uso para los negocios (sin login). Los empleados que abren el panel van directo al escáner. El escáner acepta el número de socio (función `buscar_socio`, migración 0003).
- Usuarios de los negocios: se crean desde Administración con la Edge Function `usuarios` (`supabase/functions/usuarios`, desplegada con verify_jwt = false porque valida adentro que sea superadmin con aal2). Crea el usuario de Auth, lo vincula y permite cambiarle la contraseña. Cada usuario puede cambiar la suya con "Cambiar mi contraseña".
- GitHub Pages solo sirve archivos estáticos. La app real (Next.js + Supabase) se publicará en otro lado (por ejemplo, Vercel); Pages queda para el tablero y el prototipo.

## Git
- Hacer commit y push solo cuando Fabri lo pida o lo autorice.
- Remoto: origin → https://github.com/FabrizioTurdo-Dev/tarjetasFidelizacion.git, rama main.
