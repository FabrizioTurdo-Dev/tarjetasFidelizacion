# Plan de lanzamiento — De la Casa

Actualizado: 22/10/2026.

## Objetivo
Pasar de los pilotos a un producto lanzado en **delacasa.com.ar**, donde cualquier negocio pueda pedir la prueba, armar sus propios premios y después pagar la suscripción con Mercado Pago. Vos seguís viendo y controlando todo desde el superadmin.

Google Wallet y Apple Wallet quedan **en pausa** hasta que haya ingresos. Mientras tanto, todos usan la tarjeta web (en iPhone, con el tutorial de "Agregar a inicio").

## Resumen de fases
| Fase | Qué se logra | Depende de |
| --- | --- | --- |
| 0. Nombre nuevo | La app dice "De la Casa" en todos lados | Nada, se puede hacer ya |
| 1. Dominio y mudanza | La app anda en delacasa.com.ar y los links viejos siguen funcionando | Comprar el dominio |
| 2. Premios editables por el dueño | El dueño arma y cambia su escalera de premios desde su panel | Nada |
| 3. Superadmin con control total | Ves clientes, premios, actividad y cambios de cada negocio | Fase 2 (para el historial) |
| 4. Página pública + formulario | Cualquiera pide la prueba y deja su WhatsApp; vos lo contactás | Fase 1 |
| 5. Cobro | Primero con link de Mercado Pago a mano; después automático | Monotributo, precio |
| 6. Primeros clientes | 1 o 2 negocios que llegan sin conocerte | Fases 1 a 4 |

Las fases 0, 2 y 3 se pueden hacer mientras se compra y configura el dominio.

**Regla de siempre:** cada cambio en la base (migraciones, funciones, tablas) se confirma con Fabri antes de aplicarlo, y solo en `tarjeta-fidelizacion`.

---

## Fase 0 — Cambio de nombre a De la Casa
- Reemplazar "Habitué" en la app: título, ícono de inicio (manifiestos), guía, política de privacidad, cartel ("Funciona con De la Casa"), tarjeta, mensaje de acceso que se manda desde Administración.
- Revisar los íconos: si tienen una "H", hacer los nuevos.
- Actualizar `README.md`, `docs/` y la propuesta para comercios.
- Lo que **no** se cambia: la clave interna donde el celular guarda "Mis tarjetas" (`habitue_tarjetas_v1`). Nadie la ve y cambiarla no suma nada.

## Fase 1 — Dominio y mudanza (cuando el dominio sea tuyo)

### 1.1 Compra en DomWeb
- Al comprar, fijate que el **titular** del dominio seas vos (tu CUIT), no DomWeb. En los .com.ar el titular queda registrado en NIC.ar; podés verificarlo en nic.ar con tu clave fiscal.
- Activá la renovación automática. Si el dominio se vence, dejan de andar todas las tarjetas y QR.

### 1.2 DNS
Dos opciones:
- **Cloudflare (recomendado, gratis):** creás la cuenta, agregás delacasa.com.ar y en el panel de DomWeb cambiás los servidores DNS por los dos que te da Cloudflare. Ventaja: **Email Routing gratis**, para que `hola@delacasa.com.ar` te llegue a devfabri@gmail.com.
- **El DNS de DomWeb:** también sirve si preferís no sumar otra cuenta. Ahí el correo dependería de lo que ofrezca DomWeb.

Registros para GitHub Pages (en Cloudflare, con la nube en gris: "solo DNS"):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | fabrizioturdo-dev.github.io |

### 1.3 GitHub Pages
- En GitHub → tu foto → Settings → Pages: **verificar el dominio** (te pide un registro TXT). Evita que otro repo use tu dominio.
- En el repo → Settings → Pages → Custom domain: `delacasa.com.ar`. Cuando aparezca el certificado, tildar **Enforce HTTPS**.
- Desde ese momento GitHub manda solo los links viejos de `fabrizioturdo-dev.github.io/tarjetasFidelizacion/...` al dominio nuevo, con la misma ruta.

### 1.4 Cambios en la app (los hago yo)
- La app pasa a la raíz: `delacasa.com.ar/t/?k=…`, `delacasa.com.ar/panel/`, etc.
- En `/app/` quedan páginas que reenvían a la dirección nueva. Así siguen andando los QR impresos, los links mandados por WhatsApp y los íconos guardados en iPhone. De paso, le pasan al dominio nuevo la lista de "Mis tarjetas" del celular.
- **El tablero y `data/comercios.json` dejan de estar en el sitio público.** Con el dominio nuevo, un negocio interesado podría ver tu lista de comercios contactados. El tablero pasa a verse en local o como página privada.
- El prototipo sale del sitio o queda como demo en `/demo/`.

### 1.5 Supabase
- Authentication → URL Configuration: Site URL `https://delacasa.com.ar` y agregarla en Redirect URLs.

### 1.6 Avisar a los negocios en prueba
No se pierde nada: clientes, visitas y canjes están en Supabase. Lo que tienen que hacer:
- **Dueños y empleados:** entrar de nuevo con su mail y contraseña en delacasa.com.ar y reinstalar el ícono (la sesión queda guardada por dominio).
- **Cartel del mostrador:** reimprimirlo desde el panel con el nombre y la dirección nuevos.
- **Clientes con iPhone:** su ícono sigue andando por la redirección. Si quieren que se vea sin la barra de Safari, lo vuelven a agregar la próxima vez que vayan.

Te dejo un mensaje armado para mandarles por WhatsApp cuando esté listo.

---

## Fase 2 — El dueño edita sus premios

### Qué puede hacer el dueño (desde "Premios" en su panel)
- Agregar un premio: "a las N visitas, tal premio".
- Cambiarle el nombre o las visitas a uno.
- **Pausar** un premio (deja de mostrarse y no se puede canjear) y volver a activarlo.
- Ver cómo queda la tarjeta mientras edita.
- El **empleado no** puede editar premios; solo los ve al escanear.

### Reglas para que no se rompa nada
- **Un premio que ya se canjeó no se borra, se pausa.** Así el historial de canjes sigue diciendo qué se entregó.
- **Cambiar el nombre de un premio ya canjeado crea uno nuevo y pausa el viejo.** Si no, el historial diría "torta" donde se entregó "café".
- **Límites:** hasta 10 premios activos, entre 1 y 500 visitas, nombre de hasta 80 letras, sin dos premios en la misma cantidad de visitas.
- **Aviso al subir las visitas de un premio:** "X clientes estaban por ganarlo y van a tener que esperar más". Bajarlas no necesita aviso: el cliente lo puede canjear antes.
- Recordatorio en pantalla: **el premio nunca puede ser a cambio de una reseña** (reglas de Google).

### En la base (migración nueva, se confirma antes de aplicar)
- Permisos (RLS) en `premios`: el **dueño** puede agregar y editar los de **su** negocio; el superadmin, todos. Borrar sigue siendo solo del superadmin.
- La regla de "no dos premios en las mismas visitas" pasa a contar solo los activos, para poder pausar uno y crear otro en ese número.
- Tabla `premios_cambios`: cada alta, edición o pausa queda registrada con **quién, cuándo, cómo estaba y cómo quedó**. Se llena sola con un trigger, el dueño no la puede tocar.

## Fase 3 — Superadmin con control total

### Resumen general (arriba de todo)
- Negocios por estado: en prueba, activos, vencidos, suspendidos.
- Clientes con tarjeta en total, y nuevos en los últimos 30 días.
- Visitas y canjes de los últimos 30 días.
- Cobrado en el mes (cuando exista la fase 5).
- Solicitudes nuevas sin contestar (fase 4).

### Tabla de negocios
Por cada negocio: clientes con tarjeta, visitas en 30 días, última visita registrada, premios vigentes, último cambio de premios (y quién lo hizo), estado y días de prueba o pago, y un botón para **escribirle por WhatsApp al dueño**.

Con eso se ve rápido quién lo usa de verdad y quién lo dejó tirado, que es a quien hay que llamar.

### Detalle de cada negocio
- Lo que ya está hoy: editar tarjeta, premios, usuarios, estado, borrar.
- Nuevo: **historial de cambios de premios** y un gráfico simple de visitas por semana.
- Nuevo: datos de contacto del dueño (nombre y WhatsApp), visibles solo para vos.

### Cómo se hace
Una función en la base (`resumen_admin`) que solo responde al superadmin con 2FA y trae todo junto. Así el panel no hace una consulta por negocio.

---

## Fase 4 — Página pública y formulario "Quiero probarlo"

### La página (delacasa.com.ar)
1. Título y una frase: *"La tarjeta de cliente frecuente de tu negocio, en el celular de tus clientes. Sin apps."*
2. Cómo funciona en 3 pasos: el cliente escanea el QR, vos sumás la visita, gana su premio.
3. Una tarjeta de demo para tocar (ya existe `/t/?demo=1`) y el video de 30 segundos.
4. Qué ve el dueño: clientes, quién dejó de venir, cumpleaños.
5. Precio y prueba gratis.
6. Preguntas frecuentes (¿mis clientes tienen que bajar algo?, ¿qué pasa si cambio de celular?, ¿puedo cancelar cuando quiera?).
7. El formulario.
8. Al pie: "Hecho por Fabrizio Turdó, desde Ingeniero Maschwitz", con `hola@delacasa.com.ar`, privacidad y términos.

### El formulario
- Campos: nombre del negocio, rubro, ciudad y país, tu nombre, **WhatsApp (obligatorio)**, mail (opcional), "¿cómo nos conociste?".
- Acepta la política de privacidad.
- Protección contra spam: campo oculto para bots y límite de envíos por dirección.
- Al enviar: "Gracias, te escribimos por WhatsApp en el día".

### Del lado tuyo
- Tabla `solicitudes` con estado: **nueva → contactada → habilitada / descartada**.
- En Administración: lista de solicitudes, botón **"Escribir por WhatsApp"** con un mensaje armado y botón **"Crear negocio"** que precarga los datos.
- Aviso por mail cada vez que llega una (con Resend desde una Edge Function; usa el dominio nuevo como remitente).

### Contacto y feedback de los negocios
- Botón **"Escribinos"** en el panel del dueño, que abre tu WhatsApp con el nombre del negocio ya escrito.
- El "Funciona con De la Casa" de la tarjeta y del cartel pasa a ser un link a la página: cada cliente que es dueño de otro negocio lo ve.

---

## Fase 5 — Cobro

### Antes de cobrar (decisiones tuyas)
- **Monotributo:** para cobrar suscripciones en regla tenés que poder hacer factura C por cada cobro. Mercado Pago no factura por vos.
- **Precio fundador** en pesos, y cada cuánto lo ajustás.
- **Días de prueba:** hoy son 30. Recomendación: no bajar de 21 (en 10 días casi no hay segundas visitas y el dueño no ve resultados).
- Cuenta de Mercado Pago verificada.

### 5a. Cobro manual (alcanza para los primeros 10)
- En tu cuenta de Mercado Pago creás un **plan de suscripción** desde la web (sin programar) y te da un link.
- Al terminar la prueba le mandás el link al negocio; cuando paga, lo pasás a "activa" en Administración.

### 5b. Cobro automático
1. Crear una aplicación en **Mercado Pago Developers** y guardar las credenciales de prueba y de producción como secretos de Supabase (nunca en el repo).
2. Crear el plan con la API de suscripciones.
3. En el panel del dueño: aviso "te quedan X días de prueba" y botón **"Suscribirme"**, que abre el checkout de Mercado Pago.
4. Edge Function para el webhook: **verifica la firma** y después **consulta el estado real a la API** antes de cambiar nada.
5. Tablas `suscripciones` y `pagos`; el estado del negocio cambia solo (activa / vencida). Período de gracia de unos días antes de cortar.
6. **Darse de baja desde el panel**, con un clic. Es lo que pide Defensa del Consumidor y además genera confianza.
7. Ajuste de precio: la suscripción se puede actualizar por API sin que el negocio se vuelva a suscribir (avisándole antes).
8. Términos y condiciones del servicio (precio, prueba, baja, qué pasa con los datos si deja de pagar).

---

## Fase 6 — Conseguir los primeros 1 o 2
- **Video de 30 segundos** con el celular: escanear, sumar visita, aparece el premio. Sirve para la página y para los mensajes.
- **Mensajes directos por Instagram** a cafés, panaderías, peluquerías y barberías, con el video y el link. 10 por día, a mano.
- **almadekh como caso real:** habilitarlo y, al mes, contar "X clientes con la tarjeta".
- El link "Funciona con De la Casa" en cada tarjeta trabaja solo.

---

## Para después (en pausa)
- **Google Wallet:** los pasos 1 a 6 del alta de emisor se pueden hacer cuando quieras (son gratis); el pase y el pedido de acceso de producción, cuando haya ingresos.
- **Apple Wallet:** USD 99 por año.
- Que el dueño edite también logo, colores, espera y vencimiento.
- Alta 100% autoservicio (sin que vos crees el negocio).
- Otros países (primero los de habla hispana) y cobro con tarjeta internacional (Paddle o Lemon Squeezy).
- Recordatorio de vencimiento 7 días antes y volver a pedir la reseña a las 50 visitas.

## Decisiones pendientes
| Tema | Opciones |
| --- | --- |
| Días de prueba | 30 (hoy) · 21 · 10 |
| Precio fundador | A definir |
| Monotributo | ¿Ya lo tenés? |
| DNS | Cloudflare (recomendado) · DomWeb |
| Aviso de solicitudes nuevas | Mail (recomendado) · solo en Administración |
