// Datos para buscadores y para la vista previa de los links (WhatsApp, redes).
export const SITIO = "https://delacasa.com.ar";
export const OG = [{ url: "/og.png", width: 1200, height: 630, alt: "De la Casa: la tarjeta de cliente frecuente en el celular" }];

// Open Graph de una página indexable. Next no combina el openGraph del layout con el de la página: hay que repetir todo.
export function og(title: string, description: string, url: string) {
  return { title, description, url, siteName: "De la Casa", locale: "es_AR", type: "website" as const, images: OG };
}
