import type { Metadata } from "next";
import Link from "next/link";
import { Firma } from "@/components/Firma";
import { FormPrueba } from "@/components/FormPrueba";
import { og, SITIO } from "@/lib/seo";
import { marca } from "@/lib/util";

const TITULO = "De la Casa · Tarjeta de cliente frecuente en el celular";
const DESCRIPCION = "Tarjeta de fidelización virtual para comercios de Argentina: tus clientes suman visitas y ganan premios desde el celular, sin bajar apps. 30 días gratis.";

// Página pública: qué es, cómo funciona y el formulario para pedir la prueba.
export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/" },
  openGraph: og(TITULO, DESCRIPCION, "/"),
  robots: { index: true },
};

const PREGUNTAS: [string, string][] = [
  ["¿Mis clientes tienen que bajar una app?", "No. Escanean el QR del mostrador con la cámara, completan su nombre y su teléfono, y la tarjeta queda en el celular. En iPhone la guardan en la pantalla de inicio; en Android, desde el navegador."],
  ["¿Cómo sumo una visita?", "Desde tu celular: abrís De la Casa, tocás Escanear y apuntás a la tarjeta del cliente. Si no tiene el celular a mano, lo buscás por su número de socio."],
  ["¿Qué pasa si el cliente cambia de celular?", "Desde tu panel le reenviás el link de su tarjeta por WhatsApp y recupera todas sus visitas."],
  ["¿Puedo cambiar los premios?", "Sí, cuando quieras, desde tu panel. Tus clientes ven el cambio en su tarjeta al instante."],
  ["¿Qué datos piden a mis clientes?", "Solo nombre y teléfono o mail (el cumpleaños es opcional). Sin DNI. Los datos son de tu negocio: no los vendemos ni los compartimos."],
  ["¿Y si después no quiero seguir?", "No pasa nada: la prueba no te compromete a nada. Si no seguís, la tarjeta se pausa."],
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
      featureList: ["Tarjeta de cliente frecuente en el celular, sin apps", "Visitas sumadas escaneando un QR", "Premios por cantidad de visitas", "Panel con clientes, visitas, canjes y cumpleaños"],
    },
    {
      "@type": "FAQPage", inLanguage: "es-AR",
      mainEntity: PREGUNTAS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

export default function Inicio() {
  return (
    <main className="screen landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD).replace(/</g, "\\u003c") }} />
      <header className="top">
        <strong className="marca-dlc">De la Casa</strong>
        <nav className="links"><Link href="/mis-tarjetas/">Mis tarjetas</Link><Link href="/panel/">Ingresar</Link></nav>
      </header>

      <section className="hero-l">
        <h1>La tarjeta de cliente frecuente de tu negocio, en el celular de tus clientes.</h1>
        <p className="muted">Sin apps y sin cartón. Tus clientes suman visitas, ganan premios y vuelven. Vos sabés quiénes son y a quién ir a buscar.</p>
        <a className="btn dark" href="#probar">Probalo gratis 30 días</a>
      </section>

      <div className="mini" style={marca("#7a3e2b")} aria-label="Ejemplo de tarjeta">
        <div className="biz"><div className="logo">CL</div><div><strong>Café Lunar</strong><div className="small" style={{ opacity: .85 }}>Hola, Lucía · Socia #0042</div></div></div>
        <div className="count">7 <small>visitas</small></div>
        <div className="pl"><div><span>Café de cortesía</span><span>5 ✓</span></div><div><span>Porción de torta</span><span>10</span></div><div><span>Desayuno para dos</span><span>20</span></div></div>
      </div>
      <Link className="btn ghost" href="/t/?demo=1">Ver una tarjeta de ejemplo</Link>

      <section className="box"><h2>Cómo funciona</h2>
        <ol className="pasos">
          <li><b>El cliente escanea el QR</b> del mostrador y en 20 segundos tiene su tarjeta, con su número de socio.</li>
          <li><b>Vos sumás la visita</b> escaneando su tarjeta con tu celular. Queda registrado quién la sumó y cuándo.</li>
          <li><b>Gana su premio</b> cuando llega a las visitas que elegiste: un café a las 5, una torta a las 10, lo que quieras.</li>
        </ol>
      </section>

      <section className="box"><h2>Qué ves vos</h2>
        <ul className="pasos">
          <li>Cuántos clientes tienen tu tarjeta y cuántos se suman cada mes.</li>
          <li>Quién dejó de venir hace más de 30 días, para escribirle.</li>
          <li>Tus 10 mejores clientes y los cumpleaños del mes.</li>
          <li>Visitas por día y premios entregados.</li>
        </ul>
        <p className="small muted">Además, la tarjeta invita a tus clientes a dejarte una reseña en Google desde su segunda visita, sin nada a cambio, como pide Google.</p>
      </section>

      <section className="box"><h2>Precio</h2>
        <p><b>30 días gratis</b>, sin tarjeta de crédito y sin compromiso. Te dejamos todo armado: tu tarjeta con tu nombre y tus colores, tus premios y el cartel con el QR para el mostrador.</p>
        <p className="small muted">Después, un abono mensual. Los primeros negocios tienen precio de fundador: te lo contamos por WhatsApp.</p>
      </section>

      <section className="box"><h2>Preguntas frecuentes</h2>
        {PREGUNTAS.map(([q, a]) => <details key={q}><summary>{q}</summary><p className="small muted">{a}</p></details>)}
      </section>

      <section id="probar" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 16 }}>
        <h2>Quiero probarlo</h2>
        <p className="small muted">Dejanos tus datos y te escribimos por WhatsApp en el día para armar tu tarjeta.</p>
        <FormPrueba />
      </section>

      <footer className="small muted" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
        <span>Hecho desde Ingeniero Maschwitz, Buenos Aires · <a href="mailto:devfabri@gmail.com">devfabri@gmail.com</a></span>
        <span><Link href="/privacidad/">Política de privacidad</Link> · <Link href="/guia/">Guía para negocios</Link></span>
        <Firma />
      </footer>
    </main>
  );
}
