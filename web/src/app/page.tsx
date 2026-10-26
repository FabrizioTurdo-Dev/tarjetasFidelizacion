import type { Metadata } from "next";
import Link from "next/link";
import { Firma, linkWhatsapp } from "@/components/Firma";
import { FormPrueba } from "@/components/FormPrueba";
import { Qr } from "@/components/Qr";
import { Demo } from "@/components/landing/Demo";
import { Efectos } from "@/components/landing/Efectos";
import { InsigniaFundadores, PildoraFundadores, PlanFundador } from "@/components/landing/Fundadores";
import { PanelEjemplo } from "@/components/landing/PanelEjemplo";
import { Portada } from "@/components/landing/Portada";
import { Casa } from "@/components/landing/Tarjeta";
import { CUPO_FUNDADORES, PRECIO, PRECIO_FUNDADOR } from "@/lib/precios";
import { og, SITIO } from "@/lib/seo";

const TITULO = "De la Casa · Tarjeta de cliente frecuente en el celular";
const DESCRIPCION = "Tarjeta de fidelización virtual para comercios de Argentina: tus clientes suman visitas y ganan premios desde el celular, sin bajar apps. 30 días gratis.";

// Página pública: qué es, cómo funciona, precios y el formulario para pedir la prueba.
export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/" },
  openGraph: og(TITULO, DESCRIPCION, "/"),
  robots: { index: true },
};

const PREGUNTAS: [string, string][] = [
  ["¿Mis clientes tienen que bajar una app?", "No. Escanean el QR del mostrador con la cámara, completan su nombre y su teléfono, y la tarjeta queda en el celular. En iPhone la guardan en la pantalla de inicio; en Android, desde el navegador."],
  ["¿Cuánto cuesta?", `Los primeros 30 días son gratis. Después, ${PRECIO} por mes. Los primeros ${CUPO_FUNDADORES} negocios que se suman desde esta página (socios fundadores) pagan ${PRECIO_FUNDADOR} por mes durante 6 meses, mientras queden lugares.`],
  ["¿Qué necesito para usarlo?", "Un celular con cámara para escanear las tarjetas (el tuyo o el de tus empleados) y el cartel con el QR en el mostrador, que te lo damos listo para imprimir. No hace falta computadora ni lector."],
  ["¿Cómo sumo una visita?", "Desde tu celular: abrís De la Casa, tocás Escanear y apuntás a la tarjeta del cliente. Si no tiene el celular a mano, lo buscás por su número de socio."],
  ["¿Qué pasa si el cliente cambia de celular?", "Desde tu panel le reenviás el link de su tarjeta por WhatsApp y recupera todas sus visitas."],
  ["¿Puedo cambiar los premios?", "Sí, cuando quieras, desde tu panel. Tus clientes ven el cambio en su tarjeta al instante."],
  ["¿Qué datos piden a mis clientes?", "Solo nombre y teléfono o mail (el cumpleaños es opcional). Sin DNI. Los datos son de tu negocio: no los vendemos ni los compartimos."],
  ["¿Y si después no quiero seguir?", "No pasa nada: la prueba no te compromete a nada y no hay permanencia. Si no seguís, la tarjeta se pausa."],
];

// Datos estructurados (schema.org) para Google y los asistentes de IA. Las preguntas salen de la misma lista que se muestra.
const LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${SITIO}/#org`, name: "De la Casa", url: `${SITIO}/`,
      logo: `${SITIO}/icons/icon-512.png`, email: "devfabri@gmail.com",
      address: { "@type": "PostalAddress", addressLocality: "Ingeniero Maschwitz", addressRegion: "Buenos Aires", addressCountry: "AR" },
      areaServed: { "@type": "Country", name: "Argentina" },
    },
    { "@type": "WebSite", "@id": `${SITIO}/#web`, name: "De la Casa", url: `${SITIO}/`, inLanguage: "es-AR", publisher: { "@id": `${SITIO}/#org` } },
    {
      "@type": "SoftwareApplication", name: "De la Casa", url: `${SITIO}/`, description: DESCRIPCION,
      applicationCategory: "BusinessApplication", operatingSystem: "Web, iOS, Android", inLanguage: "es-AR",
      image: `${SITIO}/og.png`, publisher: { "@id": `${SITIO}/#org` },
      offers: { "@type": "Offer", price: PRECIO.replace(/\D/g, ""), priceCurrency: "ARS", description: "Abono mensual, con 30 días de prueba gratis" },
      featureList: ["Tarjeta de cliente frecuente en el celular, sin apps", "Visitas sumadas escaneando un QR", "Premios por cantidad de visitas", "Panel con clientes, visitas, canjes y cumpleaños"],
    },
    {
      "@type": "FAQPage", inLanguage: "es-AR",
      mainEntity: PREGUNTAS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

const ESCALERAS: [string, [number, string][]][] = [
  ["Cafetería", [[5, "Café de cortesía"], [10, "Porción de torta"], [20, "Desayuno para dos"]]],
  ["Barbería", [[4, "Perfilado de barba"], [8, "Corte gratis"]]],
  ["Peluquería", [[5, "Brushing"], [10, "Tratamiento capilar"]]],
  ["Heladería", [[6, "Cucurucho"], [12, "¼ kg de helado"]]],
  ["Panadería", [[8, "Media docena de facturas"], [16, "Una torta chica"]]],
  ["Restaurante", [[5, "Postre"], [10, "Bebida de la casa"], [20, "Cena para dos"]]],
  ["Gimnasio", [[12, "Un batido"], [30, "Clase personalizada"]]],
  ["Lavadero de autos", [[5, "Aspirado gratis"], [10, "Lavado completo"]]],
];

const VS: [string, string][] = [
  ["Se pierde, se moja o queda en el otro pantalón.", "Vive en el celular, que siempre está a mano."],
  ["Cualquiera con un sello parecido lo completa.", "Solo tu equipo suma visitas, y queda registrado quién y cuándo."],
  ["No sabés quién es tu cliente.", "Sabés quién es, cuándo vino y cuándo cumple años."],
  ["Si deja de venir, ni te enterás.", "Ves quién no viene hace más de 30 días, para escribirle."],
];

// Íconos de línea propios (24×24), para la grilla de funciones.
const ICONOS = {
  reloj: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  estrella: <path d="m12 3.8 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8z" />,
  numeral: <path d="M5 9.5h15M4 14.5h15M10 4 8 20M16 4l-2 16" />,
  equipo: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" /><circle cx="16.8" cy="9.3" r="2.4" /><path d="M15.6 14.6c2.3-.2 4.2 1.3 4.9 4.1" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1M20 14v1" /></>,
  escudo: <><path d="M12 3.5 5 6.2v5.3c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6.2z" /><path d="m9 12 2 2 4-4" /></>,
  paleta: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.4 1.6-1.4H17a3.5 3.5 0 0 0 3.5-3.5c0-4.3-3.8-7.8-8.5-7.8z" /><circle cx="7.8" cy="11" r="1" /><circle cx="10.6" cy="7.6" r="1" /><circle cx="15" cy="7.8" r="1" /></>,
};
const Ico = ({ n }: { n: keyof typeof ICONOS }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONOS[n]}</svg>
);

const FUNCIONES: [keyof typeof ICONOS, string, string][] = [
  ["reloj", "Nadie suma de más", "Entre visita y visita hay un tiempo de espera (6 horas, o lo que convenga a tu negocio)."],
  ["calendario", "Un motivo para volver", "Si pasan 60 días sin venir, las visitas vencen. La tarjeta muestra la fecha y cada visita la renueva."],
  ["estrella", "Reseñas en Google", "Desde la 2ª visita, la tarjeta invita a dejarte una reseña. Sin nada a cambio, como pide Google."],
  ["numeral", "Número de socio", "¿Se quedó sin batería? Lo buscás por su número y le sumás la visita igual."],
  ["equipo", "Tu equipo, con su usuario", "Cada empleado entra con el suyo y queda registrado quién sumó cada visita y cuándo."],
  ["qr", "Cartel listo", "Te damos el cartel con tu QR para imprimir y poner en el mostrador."],
  ["paleta", "Con tu marca", "Tu nombre, tus colores y un «Sobre nosotros» con tus links: carta, Instagram, WhatsApp."],
  ["escudo", "Datos cuidados", "Solo nombre y teléfono o mail, sin DNI. Los datos son de tu negocio (Ley 25.326)."],
];

const INCLUYE = [
  "Clientes y visitas sin límite",
  "Tarjeta con tu nombre y tus colores",
  "Hasta 10 premios, los cambiás cuando quieras",
  "Panel: clientes, dormidos, top y cumpleaños",
  "Usuarios para tus empleados",
  "Cartel con tu QR para imprimir",
  "Te la dejamos armada y te ayudamos por WhatsApp",
];

export default function Inicio() {
  return (
    <main className="lp">
      {/* Con JavaScript, los bloques .rv arrancan escondidos y aparecen al bajar (ver Efectos). */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('rv-on')" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD).replace(/</g, "\\u003c") }} />
      <Efectos />

      <header className="l-head">
        <div className="l-wrap l-head-in">
          <Link href="/" className="l-logo"><Casa /> De la Casa</Link>
          <nav className="l-nav" aria-label="Secciones">
            <a href="#como">Cómo funciona</a><a href="#demo">Probala</a><a href="#precios">Precios</a><a href="#preguntas">Preguntas</a>
          </nav>
          <div className="l-head-acc">
            <Link href="/mis-tarjetas/" className="l-solo-ancho">Mis tarjetas</Link>
            <Link href="/panel/">Ingresar</Link>
            <a href="#probar" className="l-btn l-btn-osc l-btn-chico">Probalo gratis</a>
          </div>
        </div>
      </header>

      {/* Portada */}
      <section className="l-hero">
        <div className="l-wrap l-hero-in">
          <div className="l-hero-txt">
            <InsigniaFundadores />
            <h1 className="l-entra" style={{ ["--d" as string]: 1 }}>Que tus clientes <em>vuelvan.</em><span>Y que sepas quiénes son.</span></h1>
            <p className="l-lead l-entra" style={{ ["--d" as string]: 2 }}>La tarjeta de cliente frecuente de tu negocio, en el celular de tus clientes. Escanean el QR del mostrador, suman visitas y ganan los premios que vos elegís. Sin apps y sin cartón.</p>
            <div className="l-ctas l-entra" style={{ ["--d" as string]: 3 }}>
              <a href="#probar" className="l-btn l-btn-osc">Probalo gratis 30 días</a>
              <a href="#demo" className="l-btn l-btn-borde">Probá la demo</a>
            </div>
            <ul className="l-checks l-entra" style={{ ["--d" as string]: 4 }}>
              <li>Sin bajar apps</li><li>iPhone y Android</li><li>Sin tarjeta de crédito</li>
            </ul>
          </div>
          <div className="l-hero-vis l-entra" style={{ ["--d" as string]: 2 }}><Portada /></div>
        </div>
      </section>

      {/* Cartón vs. De la Casa */}
      <section className="l-sec">
        <div className="l-wrap l-vs">
          <div className="l-vs-vis rv" aria-hidden>
            <div className="l-carton">
              <div className="l-carton-h"><b>Cliente frecuente</b><small>Juntá 10 sellos y ganá</small></div>
              <div className="l-sellos">{Array.from({ length: 10 }, (_, i) => <span key={i} className={i < 6 ? "on" : undefined} style={{ ["--i" as string]: i }} />)}</div>
              <div className="l-carton-pie">Nombre: <span>Lu…</span></div>
              <i className="l-mancha" />
            </div>
            <div className="l-vs-digital">
              <div className="l-mini">
                <div className="l-tj-biz"><span className="l-tj-logo"><Casa /></span><span><b>De la Casa</b><small>Hola, Lucía · Socio #0042</small></span></div>
                <div className="l-tj-n"><b>2</b> <small>visitas</small></div>
                <div className="l-mini-pr"><span>30 días de prueba gratis</span><span>2 ✓</span></div>
              </div>
            </div>
          </div>
          <div className="l-vs-txt">
            <p className="l-eyebrow rv">Adiós al cartón</p>
            <h2 className="rv">El cartón se pierde, se moja y no te dice nada.</h2>
            <p className="l-lead rv">La tarjeta de De la Casa vive en el celular de tu cliente y a vos te cuenta quién vuelve, cada cuánto y quién dejó de venir.</p>
            <div className="l-vs-tabla">
              <div className="l-vs-cab rv"><span>Tarjeta de cartón</span><span>De la Casa</span></div>
              {VS.map(([a, b], i) => (
                <div className="l-vs-fila rv" key={i} style={{ ["--d" as string]: i }}><span>{a}</span><span>{b}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="l-sec l-sec-papel" id="como">
        <div className="l-wrap">
          <div className="l-sec-cab">
            <p className="l-eyebrow rv">Cómo funciona</p>
            <h2 className="rv">Tres pasos. Ninguna app.</h2>
            <p className="l-lead rv">Funciona con el celular que tu cliente ya tiene en la mano y con el tuyo.</p>
          </div>
          <ol className="l-pasos">
            <li className="rv" style={{ ["--d" as string]: 0 }}>
              <div className="l-paso-vis l-pv-qr" aria-hidden>
                <div className="l-pv-cartel"><small>De la Casa</small><b>Sumá visitas y ganá premios</b>
                  <span className="l-pv-qrw"><Qr texto="https://delacasa.com.ar/" size={92} /><span className="l-pv-marco"><i /><i /><i /><i /></span></span></div>
                <span className="l-pv-ok">¡Listo, ya sos socio! #0043</span>
              </div>
              <span className="l-paso-n">01</span>
              <h3>El cliente escanea el QR</h3>
              <p>Lo apunta con la cámara, deja su nombre y su teléfono, y en 20 segundos tiene su tarjeta con número de socio.</p>
            </li>
            <li className="rv" style={{ ["--d" as string]: 1 }}>
              <div className="l-paso-vis l-pv-sumar" aria-hidden>
                <div className="l-pv-res"><span className="who">Martín · socio #0012</span><b>Visita sumada: 7</b><span>Le faltan 3 para: Porción de torta.</span></div>
                <div className="l-pv-res atras"><span className="who">Sofía · socio #0007</span><b>Visita sumada: 3</b></div>
              </div>
              <span className="l-paso-n">02</span>
              <h3>Vos sumás la visita</h3>
              <p>Escaneás su tarjeta con tu celular, o lo buscás por su número de socio. Queda registrado quién la sumó y cuándo.</p>
            </li>
            <li className="rv" style={{ ["--d" as string]: 2 }}>
              <div className="l-paso-vis l-pv-premio" aria-hidden>
                <div className="l-pv-esc"><span><b>5</b>Café de cortesía</span><em>Ya lo canjeaste</em></div>
                <div className="l-pv-esc gana"><span><b>10</b>Porción de torta</span><em>¡Ya lo ganaste!</em></div>
                <div className="l-pv-esc"><span><b>20</b>Desayuno para dos</span><em>faltan 10</em></div>
              </div>
              <span className="l-paso-n">03</span>
              <h3>Gana su premio</h3>
              <p>Cuando llega a las visitas que elegiste, lo ves al escanear y se lo entregás. Sus visitas siguen sumando para el próximo.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Demo para tocar */}
      <section className="l-sec l-sec-osc" id="demo">
        <div className="l-wrap">
          <div className="l-sec-cab">
            <p className="l-eyebrow rv">Probala acá</p>
            <h2 className="rv">Sumale una visita a Lucía.</h2>
            <p className="l-lead rv">A la izquierda, lo que ves vos al escanear. A la derecha, la tarjeta de tu clienta.</p>
          </div>
          <div className="rv"><Demo /></div>
          <p className="l-demo-pie rv">¿Querés ver una de verdad? <Link href="/alta/?n=delacasa">Sacá la tarjeta de De la Casa en tu celular <span aria-hidden>→</span></Link></p>
        </div>
      </section>

      {/* Panel */}
      <section className="l-sec">
        <div className="l-wrap l-panel-sec">
          <div>
            <p className="l-eyebrow rv">Tu panel</p>
            <h2 className="rv">Sabés quién vuelve. Y quién no.</h2>
            <p className="l-lead rv">Desde el celular o la compu, sin planillas.</p>
            <ul className="l-lista">
              <li className="rv"><b>Cuántos clientes</b> tienen tu tarjeta y cuántos se suman cada mes.</li>
              <li className="rv"><b>Quién dejó de venir</b> hace más de 30 días, para escribirle.</li>
              <li className="rv"><b>Tus mejores clientes</b> y los cumpleaños del mes.</li>
              <li className="rv"><b>Visitas por día</b> y premios entregados.</li>
            </ul>
          </div>
          <div className="rv"><PanelEjemplo /></div>
        </div>
      </section>

      {/* Funciones */}
      <section className="l-sec l-sec-papel">
        <div className="l-wrap">
          <div className="l-sec-cab">
            <p className="l-eyebrow rv">Y además</p>
            <h2 className="rv">Pensada para el mostrador de verdad.</h2>
          </div>
          <div className="l-func">
            {FUNCIONES.map(([ic, t, d], i) => (
              <div className="l-func-i rv" key={t} style={{ ["--d" as string]: i % 4 }}><span className="l-func-ico"><Ico n={ic} /></span><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideas por rubro */}
      <section className="l-sec">
        <div className="l-wrap">
          <div className="l-sec-cab">
            <p className="l-eyebrow rv">Ideas para tu rubro</p>
            <h2 className="rv">Vos elegís los premios.</h2>
            <p className="l-lead rv">Armás una escalera y la cambiás cuando quieras. Canjear no descuenta visitas: tu cliente sigue sumando para el próximo premio.</p>
          </div>
          <div className="l-rubros">
            {ESCALERAS.map(([r, esc], i) => (
              <div className="l-rubro rv" key={r} style={{ ["--d" as string]: i % 4 }}>
                <h3>{r}</h3>
                {esc.map(([n, p]) => <div key={n}><b>{n} visitas</b><span>{p}</span></div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="l-sec l-sec-papel" id="precios">
        <div className="l-wrap">
          <div className="l-sec-cab">
            <p className="l-eyebrow rv">Precios</p>
            <h2 className="rv">Un solo plan. Todo incluido.</h2>
            <p className="l-lead rv">Primero la probás 30 días gratis, sin tarjeta de crédito. Si te sirve, seguís; si no, no pagás nada.</p>
          </div>
          <div className="l-precios">
            <div className="l-plan rv">
              <p className="l-plan-n">Plan De la Casa</p>
              <p className="l-plan-p"><b>{PRECIO}</b> <span>por mes</span></p>
              <p className="l-plan-sub">Menos de $700 por día.</p>
              <ul className="l-incluye">{INCLUYE.map((x) => <li key={x}>{x}</li>)}</ul>
              <a href="#probar" className="l-btn l-btn-osc">Probalo gratis 30 días</a>
            </div>
            <PlanFundador />
          </div>
          <p className="l-precios-pie rv">Precios en pesos argentinos. Sin costo de alta y sin permanencia.</p>
        </div>
      </section>

      {/* Preguntas */}
      <section className="l-sec" id="preguntas">
        <div className="l-wrap l-faq">
          <div>
            <p className="l-eyebrow rv">Preguntas frecuentes</p>
            <h2 className="rv">Lo que todos preguntan.</h2>
            <p className="l-lead rv">¿Te quedó otra? <a href={linkWhatsapp("¡Hola, Fabrizio! Vi De la Casa y tengo una pregunta: ")} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a> y te respondemos en el día.</p>
          </div>
          <div className="l-faq-l rv">
            {PREGUNTAS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      {/* Formulario */}
      <section className="l-final" id="probar">
        <div className="l-wrap l-final-in">
          <div>
            <p className="l-eyebrow rv">Quiero probarlo</p>
            <h2 className="rv">Que tus clientes vuelvan, desde esta semana.</h2>
            <ul className="l-checks l-checks-col rv">
              <li>Te escribimos por WhatsApp en el día.</li>
              <li>Te dejamos la tarjeta armada, con tus premios y el cartel con el QR.</li>
              <li>30 días gratis, sin tarjeta de crédito.</li>
            </ul>
            <p className="l-final-wa rv">¿Preferís hablar directo? <a href={linkWhatsapp("¡Hola, Fabrizio! Quiero probar De la Casa en mi negocio.")} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.</p>
          </div>
          <div className="rv"><FormPrueba /></div>
        </div>
      </section>

      <footer className="l-pie">
        <div className="l-wrap l-pie-in">
          <div>
            <Link href="/" className="l-logo"><Casa /> De la Casa</Link>
            <p>Tarjeta de cliente frecuente para comercios y servicios de Argentina. Hecho desde Ingeniero Maschwitz, Buenos Aires.</p>
          </div>
          <nav aria-label="Enlaces">
            <Link href="/guia/">Guía para negocios</Link>
            <Link href="/mis-tarjetas/">Mis tarjetas</Link>
            <Link href="/panel/">Ingresar</Link>
            <Link href="/privacidad/">Política de privacidad</Link>
          </nav>
          <div>
            <a href="mailto:devfabri@gmail.com">devfabri@gmail.com</a>
            <a href={linkWhatsapp("¡Hola, Fabrizio! Vi De la Casa y quiero saber más para mi negocio.")} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
        </div>
        <Firma />
      </footer>

      <PildoraFundadores />
    </main>
  );
}
