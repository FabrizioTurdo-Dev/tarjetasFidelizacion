# Tarjeta de fidelización virtual — Plan de MVP

Actualizado: 19/10/2026. Versión editable online: https://claude.ai/code/artifact/b09251e4-4eea-4b3d-8fce-ea179037d456

## Resumen
Un SaaS que reemplaza la tarjeta de sellos de cartón por una tarjeta en el celular del cliente, que el negocio administra desde un panel web por una suscripción mensual.

- **Cliente final:** se suma escaneando un QR en el mostrador, sin descargar apps. Ve sus visitas y qué premios puede canjear.
- **Negocio:** sabe quiénes son sus clientes, cuándo vinieron por última vez y a quién ir a buscar.
- **Vos:** ingreso mensual recurrente por cada negocio.

Argumento de venta: *"Sabé quiénes son tus clientes y hacelos volver, sin que tengan que bajarse nada."*

## Alcance del MVP
| Tema | MVP (ahora) | Versión 2 (si funciona) |
| --- | --- | --- |
| Programa | Solo por visitas (sellos) | Puntos por monto gastado |
| Tarjeta Android | Google Wallet (cuenta gratis) | — |
| Tarjeta iPhone | Tarjeta web con QR, guardada en la pantalla de inicio (con tutorial) | Apple Wallet (cuenta propia, 99 USD/año) |
| Panel del negocio | Web + PWA: escanear, canjear, lista de clientes | Métricas avanzadas, exportar a Excel |
| Notificaciones | Recordatorio de vencimiento y a clientes dormidos (Google Wallet) | Notificaciones por cercanía |
| Sucursales | Una por negocio | Varias sucursales con la misma tarjeta |
| Alta y cobro | Manual; prueba gratis de 30 días | Registro solo + Mercado Pago automático |
| Usuarios del negocio | Dueño + empleados | Permisos más finos |

## Decisiones tomadas
| Tema | Decisión |
| --- | --- |
| Nombre | Entre Habitué y De la Casa |
| Período de espera entre visitas | 6 horas |
| Premios | Escalera de premios por negocio (ej. 10 visitas: café, 20: torta, 100: cena). Las visitas son acumuladas: canjear NO las descuenta. Cada premio se canjea una vez. Los carga el superadmin; el dueño los edita en la versión 2 o 3. Visitas como moneda (canjear descuenta): con puntos, versión 2 |
| Vencimiento | Por inactividad: si pasan 60 días sin visitas, el contador se reinicia y la visita nueva cuenta como 1. Cada visita reinicia el plazo |
| Aviso de vencimiento | La tarjeta muestra cuándo vencen; recordatorio 7 días antes |
| Alta de negocios | Manual |
| Prueba gratis | 30 días desde el alta |
| Cobro en el MVP | Manual (transferencia o link de pago) |
| Apple Wallet | Cuenta propia más adelante |
| Tutorial iPhone | Pantalla automática al abrir la tarjeta desde iPhone |
| Tecnología | Supabase + Next.js |
| Pilotos | almadekh (restaurante) + 2 de otros rubros |

## Cómo funciona
El empleado escanea la tarjeta del cliente, nunca al revés.

**Alta del cliente final**
1. El negocio tiene un cartelito con un QR en el mostrador.
2. El cliente lo escanea y completa: nombre, teléfono o mail, cumpleaños opcional, acepta la política de privacidad.
3. Recibe su número de socio (#0001, #0002…).
4. Android: "Agregar a Google Wallet". iPhone: se abre su tarjeta web con el tutorial para guardarla en la pantalla de inicio.

**Sumar una visita**
1. El cliente muestra su tarjeta.
2. El empleado, logueado, escanea el QR con la cámara.
3. El sistema revisa el período de espera (6 horas) y el vencimiento por inactividad (60 días).
4. Suma la visita y la tarjeta se actualiza, o muestra "Ya registrada".

**Canjear un premio**
1. Al llegar a las visitas de un premio, la tarjeta muestra "¡Ya lo ganaste!".
2. El empleado escanea y toca "Entregar premio"; queda registrado quién y cuándo. Las visitas no se descuentan: el contador sigue hacia el próximo premio.

**Anti-trampa**
- Solo usuarios logueados del negocio suman o canjean.
- Período de espera configurable.
- Registro de quién sumó qué y cuándo.
- El QR solo identifica al cliente; escanearlo con otro celular no suma nada.

## La tarjeta
**Android → Google Wallet (gratis).** Cuenta de emisor en la Google Pay & Wallet Console, sin costo ([guía](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding)). Arranca en modo demo (solo cuentas de prueba); pedir acceso de producción temprano.

**iPhone → tarjeta web (gratis).** Página propia de cada cliente (`dominio/t/<token-secreto>`) con logo, visitas, socio, QR, premios y vencimiento. Se guarda con "Agregar a inicio". No está en Apple Wallet ni manda notificaciones.

**Apple Wallet:** con cuenta propia (99 USD/año) cuando haya negocios pagando.

## Paneles
| Usuario | Desde dónde | Qué puede hacer |
| --- | --- | --- |
| Empleado | Celular del mostrador (PWA) | Escanear, sumar visita, canjear |
| Dueño | Compu o celular | Lo del empleado + configurar tarjeta, ver clientes y métricas, gestionar empleados |
| Superadmin | Compu | Alta manual de negocios, editar su tarjeta (nombre, color, premios, espera, vencimiento, empleados), estado de pago, días de prueba, suspender/reactivar |

Qué ve el dueño: lista de clientes (nombre, socio, visitas, última visita, alta), dormidos (+30 días), top 10, visitas por día, canjes, cumpleaños del mes.

## Estados de la cuenta
| Estado | Qué pasa | Duración |
| --- | --- | --- |
| Prueba | Todo funciona | 30 días |
| Activa | Todo funciona | Mientras pague |
| Pago vencido | Todo funciona + aviso | 7 días de gracia |
| Suspendida | Solo lectura; las tarjetas de los clientes quedan congeladas, no se borran | Hasta 60 días |
| Cancelada | Aviso previo, exportar clientes, luego se borran los datos | — |

## Versión 2: Mercado Pago automático
- Suscripciones de Mercado Pago con débito automático; webhooks para pago aprobado/fallido ([docs](https://www.mercadopago.com.ar/developers/en/docs/subscriptions/integration-configuration/subscription-associated-plan)).
- Avisos 10, 3 y 1 día antes del vencimiento.

## Seguridad
- Los datos de tarjeta nunca pasan por nuestros servidores: checkout de Mercado Pago.
- Verificar la firma de cada webhook y consultar el estado real a la API.
- Supabase Auth para login; RLS en todas las tablas; 2FA para superadmin; límite de intentos.
- Empleados con permisos mínimos.
- Secretos en variables de entorno, nunca en el código ni en git.
- HTTPS; datos mínimos del cliente (sin DNI); token aleatorio en el link de la tarjeta; backups.
- Revisar con especial cuidado login, permisos y pagos.

## Precio y costos
- MVP con costos fijos casi cero (Google Wallet, hosting y base gratis al principio; dominio barato).
- Pilotos: 30 días gratis, luego "precio fundador" (ej. ARS 15.000) congelado 6 meses.
- Público general: ARS 20.000 a 25.000/mes, ajuste trimestral por inflación.
- Más adelante: plan anual pagando 10 meses.

## Legal
- Términos y Condiciones (negocios) y Política de Privacidad (clientes finales).
- Ley 25.326; inscribir la base ante la AAIP.
- Inscripción para facturar (ej. monotributo).
- Consulta única con un abogado antes de abrir a todos.

## Plan de lanzamiento
1. Construir el MVP.
2. Probarlo con 2 o 3 celulares (Android y iPhone).
3. Sumar 3 pilotos (almadekh + 2 de otros rubros).
4. 4 a 8 semanas de prueba: fallas, qué falta, cuánto pagarían.
5. Pedir acceso de producción de Google Wallet.
6. Cobro y términos y condiciones.
7. Decidir la versión 2.
