// Notificaciones web sin librerías: cifrado del mensaje (aes128gcm, RFC 8291) y firma VAPID (RFC 8292).
// Solo usa WebCrypto, así que corre igual en la Edge Function (Deno) que en Node para probarlo.

export type Suscripcion = { id: string; endpoint: string; p256dh: string; auth: string };

const enc = new TextEncoder();
export const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const deB64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
export const juntar = (...partes: Uint8Array[]) => {
  const r = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) { r.set(p, i); i += p.length; }
  return r;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}

/** Cifra el mensaje para una suscripción, con una clave de un solo uso. Solo ese celular lo puede leer. */
export async function cifrar(texto: string, s: Pick<Suscripcion, "p256dh" | "auth">) {
  const ua = deB64u(s.p256dh), secreto = deB64u(s.auth);
  const efimera = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const as = new Uint8Array(await crypto.subtle.exportKey("raw", efimera.publicKey) as ArrayBuffer);
  const deUa = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: deUa }, efimera.privateKey, 256));
  const ikm = await hkdf(secreto, compartido, juntar(enc.encode("WebPush: info\0"), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, juntar(enc.encode(texto), new Uint8Array([2]))));
  // Encabezado: salt, tamaño de registro (4096), largo de la clave pública y la clave.
  return juntar(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([as.length]), as, cifrado);
}

/** Claves VAPID a partir del JWK privado (la pública es 04 + x + y). */
export async function clavesVapid(jwk: JsonWebKey) {
  const privada = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: jwk.d, x: jwk.x, y: jwk.y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { privada, publica: b64u(juntar(new Uint8Array([4]), deB64u(jwk.x!), deB64u(jwk.y!))) };
}

/** Encabezado Authorization: le dice al servicio de avisos (Google, Apple, Mozilla) que el mensaje viene de De la Casa. */
export async function vapid(endpoint: string, claves: { privada: CryptoKey; publica: string }, contacto: string) {
  const cab = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const datos = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contacto })));
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, claves.privada, enc.encode(`${cab}.${datos}`)));
  return `vapid t=${cab}.${datos}.${b64u(firma)}, k=${claves.publica}`;
}
