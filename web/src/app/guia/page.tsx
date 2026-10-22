import Link from "next/link";
import { Firma, linkWhatsapp } from "@/components/Firma";

// Guía para el negocio (dueño y empleados). Sin login: se puede mandar el link por WhatsApp o imprimir.
export const metadata = { title: "Cómo se usa · De la Casa" };

export default function Guia() {
  return (
    <main className="screen guia">
      <div className="links noprint"><Link href="/panel/">← Volver al panel</Link></div>
      <div>
        <h1>Cómo se usa De la Casa</h1>
        <p className="muted" style={{ marginTop: 6 }}>Guía para el negocio. Leela una vez y tenela a mano: se lee en 5 minutos.</p>
      </div>
      <nav className="noprint" aria-label="Secciones">
        <a href="#instalar">Instalar</a><a href="#clientes">Clientes nuevos</a><a href="#visitas">Sumar visitas</a>
        <a href="#premios">Entregar premios</a><a href="#resenas">Reseñas</a><a href="#panel">Panel</a><a href="#problemas">Problemas frecuentes</a>
      </nav>

      <section className="box">
        <h2>Qué es</h2>
        <p>De la Casa es la tarjeta de cliente frecuente de tu negocio, en el celular de tus clientes. Ellos no descargan nada. Vos marcás cada visita escaneando su tarjeta y, cuando llegan a la meta, les das el premio.</p>
        <p>Antes de arrancar te dejamos listo: tu tarjeta (nombre, color y premios), tu usuario con mail y contraseña, y el QR para el mostrador.</p>
      </section>

      <section className="box" id="instalar">
        <h2>1. Instalá De la Casa en el celular del local</h2>
        <p><b>Android (Chrome):</b></p>
        <ol>
          <li>Abrí en Chrome el link que te pasamos e ingresá con tu mail y contraseña.</li>
          <li>Tocá <b>Instalar De la Casa en este celular</b>. Si no aparece, usá el menú <b>⋮</b> → <b>Instalar app</b> (o <b>Agregar a la pantalla principal</b>).</li>
          <li>Queda el ícono <b>De la Casa</b> en tu pantalla. Si lo mantenés apretado, aparece el atajo <b>Escanear</b>.</li>
        </ol>
        <p><b>iPhone (Safari):</b></p>
        <ol>
          <li>Abrí el link en Safari.</li>
          <li>Tocá <b>Compartir</b> (el cuadrado con la flecha) → <b>Agregar a inicio</b> → <b>Agregar</b>.</li>
          <li>Abrí De la Casa desde el ícono nuevo e ingresá con tu mail y contraseña (la primera vez lo pide de nuevo).</li>
        </ol>
        <p className="tip">El ícono abre el panel, con el botón <b>Escanear tarjeta</b> arriba de todo. Si el usuario es de un empleado, entra directo al escáner.</p>
      </section>

      <section className="box" id="clientes">
        <h2>2. Cómo se suma un cliente nuevo</h2>
        <ol>
          <li>El cliente escanea con la cámara de su celular el QR del mostrador.</li>
          <li>Completa su nombre y su teléfono (o mail). El cumpleaños es opcional.</li>
          <li>Le aparece su tarjeta, con su número de socio. Pedile que la guarde en el celular: en iPhone la tarjeta le muestra cómo hacerlo; en Android, con el botón <b>Guardar en la pantalla de inicio</b>.</li>
          <li>Escaneá su tarjeta en ese momento, así ya suma la primera visita.</li>
        </ol>
        <p className="tip">Ofrecéselo al cobrar: «¿Te hacés socio? A las 10 visitas te regalamos un café». Lleva 30 segundos.</p>
      </section>

      <section className="box" id="visitas">
        <h2>3. Sumar una visita</h2>
        <ol>
          <li>Abrí De la Casa y tocá <b>Escanear tarjeta</b>.</li>
          <li>Apuntá la cámara al QR de la tarjeta del cliente.</li>
          <li>Listo: en pantalla ves <b>Visita sumada</b> y cuántas le faltan para el próximo premio.</li>
        </ol>
        <ul>
          <li>Para evitar errores, cada cliente suma como máximo una visita cada 6 horas (lo podemos ajustar para tu negocio). Si escaneás antes, no suma nada y te avisa desde qué hora puede.</li>
          <li>Cada visita queda registrada con el usuario que la sumó y la hora.</li>
          <li><b>¿No anda la cámara?</b> Debajo del escáner escribí el número de socio, que está en la tarjeta del cliente («Socio #0042»: escribí 42). Te muestra el nombre para que confirmes antes de sumar.</li>
        </ul>
      </section>

      <section className="box" id="premios">
        <h2>4. Entregar un premio</h2>
        <ol>
          <li>Cuando escaneás a un cliente que ganó un premio, aparece <b>¡Tiene un premio!</b> con el botón <b>Entregar premio</b>.</li>
          <li>Tocalo solo cuando se lo das. Queda registrado.</li>
          <li>Si no lo quiere ahora, no toques nada: el premio le queda guardado en su tarjeta.</li>
        </ol>
        <p>Las visitas no se descuentan al canjear: siguen sumando para el próximo premio. Cada premio se entrega una sola vez.</p>
        <p><b>Vencimiento:</b> si un cliente pasa 60 días sin venir, sus visitas vencen y la próxima cuenta como la primera. Cada visita renueva el plazo, y el cliente ve en su tarjeta hasta cuándo tiene.</p>
      </section>

      <section className="box" id="resenas">
        <h2>5. Reseñas en Google</h2>
        <p>Si nos pasás el link de <b>Pedir reseñas</b> de tu Perfil de Empresa de Google, la tarjeta invita a cada cliente a dejar su reseña a partir de su 2ª visita, cuando ya conoce el lugar. Se lo ofrece una sola vez y lo abre directo en las estrellas.</p>
        <p><b>Lo que Google no permite</b> (y puede borrarte reseñas o penalizar tu ficha):</p>
        <ul>
          <li>Dar algo a cambio de una reseña: descuentos, visitas extra, premios o la tarjeta misma.</li>
          <li>Pedírsela solo a los clientes contentos, o decirles qué tienen que escribir.</li>
          <li>Presionar para que la hagan ahí, en el local, o ponerles metas de reseñas a los empleados.</li>
        </ul>
        <p className="tip">Sí podés decir: «Si te gustó, en tu tarjeta podés dejarnos una reseña». Sin nada a cambio y a todos por igual.</p>
      </section>

      <section className="box" id="panel">
        <h2>6. El panel (solo dueños)</h2>
        <ul>
          <li><b>Clientes con tu tarjeta:</b> cuántos tenés y cuántos se sumaron en los últimos 30 días.</li>
          <li><b>Visitas</b> de hoy y de las últimas dos semanas, y <b>premios entregados</b>.</li>
          <li><b>Dormidos:</b> clientes que hace más de 30 días que no vienen. Es la lista ideal para mandarles un mensaje.</li>
          <li><b>Top 10:</b> tus clientes más fieles.</li>
          <li><b>Cumpleaños del mes:</b> un saludo o un detalle suma mucho.</li>
          <li><b>Todos los clientes,</b> con su contacto, sus visitas y su última visita.</li>
          <li><b>Tus premios:</b> la escalera de premios que tiene tu tarjeta.</li>
          <li><b>Reseñas en Google:</b> cuántos clientes tocaron el botón para dejar su reseña.</li>
          <li><b>Cartel para el mostrador:</b> si se te pierde o se rompe el del QR, lo volvés a imprimir desde ahí.</li>
        </ul>
      </section>

      <section className="box" id="problemas">
        <h2>7. Problemas frecuentes</h2>
        <ul>
          <li><b>El cliente cambió de celular o borró la tarjeta.</b> En el panel, en <b>Todos los clientes</b>, tocá <b>Reenviar link</b> y mandáselo por WhatsApp. Recupera todas sus visitas.</li>
          <li><b>El cliente se quiere registrar de nuevo.</b> Cada teléfono o mail tiene una sola tarjeta por negocio: reenviale el link.</li>
          <li><b>«Ya sumó una visita hace poco».</b> Es la espera entre visitas. No se sumó nada; está todo bien.</li>
          <li><b>No abre la cámara.</b> Revisá que el navegador tenga permiso de cámara (en los ajustes del celular). Mientras tanto, escribí el número de socio.</li>
          <li><b>Quiero cambiar un premio, el color o agregar un empleado.</b> Escribinos por WhatsApp y lo cambiamos nosotros.</li>
          <li><b>Me olvidé la contraseña.</b> Escribinos y te ponemos una nueva. Para cambiarla vos, abajo de todo en el panel tocá <b>Cambiar mi contraseña</b>.</li>
          <li><b>Se fue un empleado.</b> Avisanos y le damos de baja el usuario.</li>
          <li><b>Un cliente pide que borren sus datos.</b> Avisanos y los borramos (lo pide la ley 25.326).</li>
        </ul>
      </section>

      <section className="box">
        <h2>Prueba gratis y abono</h2>
        <p>Tenés 30 días gratis desde el alta, sin compromiso. Si querés seguir, pagás un abono mensual por transferencia o link de pago. Si no, la tarjeta se pausa: no se suman más visitas ni clientes nuevos.</p>
        <p className="small muted">Tus clientes dan solo nombre y teléfono o mail, sin DNI. Los datos son de tu negocio: no los vendemos ni los compartimos.</p>
      </section>

      <p className="muted small" style={{ textAlign: "center" }}>¿Dudas? <a href={linkWhatsapp("¡Hola, Fabrizio! Te escribo por De la Casa, tengo una consulta.")} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.</p>
      <Firma />
    </main>
  );
}
