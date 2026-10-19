// Export estático: sirve en GitHub Pages hoy y en Netlify/Cloudflare/Vercel mañana.
// En Pages la app vive en /tarjetasFidelizacion/app; en local, en la raíz.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};
