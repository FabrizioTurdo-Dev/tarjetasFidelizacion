import { GTM } from "@/lib/analytics";

// Etiqueta de Google (Tag Manager) tal como la da Google, en el HTML de la página (React la sube al <head>).
// Va solo en las páginas públicas (principal, guía y privacidad): las tarjetas, altas y paneles no se miden.
// Tiene que estar en el HTML y no agregarse después con JavaScript: si no, el verificador de Google no la encuentra.
export function EtiquetaGoogle() {
  if (!GTM) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${GTM}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());",
        }}
      />
    </>
  );
}
