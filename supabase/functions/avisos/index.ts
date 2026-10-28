// Avisos al celular (notificaciones web) cuando alguien completa el formulario "Quiero probarlo".
// La llama la base al entrar una solicitud (trigger de la migración 0008), sin datos ni credenciales:
// ella misma busca las solicitudes que no se avisaron y las marca, así que llamarla de más no repite avisos.
//   { prueba: true } con la sesión del superadmin (2FA) → manda un aviso de prueba a sus celulares.
// Se despliega con verify_jwt = false. Secreto: VAPID_PRIVADA (clave privada en JWK; la pública sale de ahí
// y es la misma que está en web/src/components/admin/Avisos.tsx).
// El mensaje va cifrado de punta a punta (webpush.ts): Google o Apple lo llevan al celular pero no lo pueden leer.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cifrar, clavesVapid, vapid, type Suscripcion } from "./webpush.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fallar = (error: string, status = 400) => responder({ error }, status);

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const clave = (nuevas: string, vieja: string) => {
  try { const k = JSON.parse(Deno.env.get(nuevas) || "{}").default; if (k) return k as string; } catch { /* sin claves nuevas */ }
  return Deno.env.get(vieja)!;
};
const SECRETA = clave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const CONTACTO = "mailto:devfabri@gmail.com";

type Aviso = { titulo: string; cuerpo: string; tag: string };

/** Datos del token. Solo se leen después de que Auth confirmó que el token es válido. */
function claims(token: string): Record<string, unknown> {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fallar("metodo_invalido", 405);

  let claves: Awaited<ReturnType<typeof clavesVapid>>;
  try { claves = await clavesVapid(JSON.parse(Deno.env.get("VAPID_PRIVADA") || "")); } catch { return fallar("falta_vapid", 500); }

  const admin = createClient(URL_SB, SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* la base llama sin cuerpo */ }

  let avisos: Aviso[];
  let destino = admin.from("avisos_suscripciones").select("id,endpoint,p256dh,auth");

  if (b.prueba) {
    // Prueba: solo el superadmin con 2FA, y solo a sus propios celulares.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return fallar("sin_permiso", 401);
    const { data: quien, error } = await admin.auth.getUser(token);
    if (error || !quien.user) return fallar("sin_permiso", 401);
    if (claims(token).aal !== "aal2") return fallar("sin_permiso", 403);
    const { data: perfil } = await admin.from("perfiles").select("es_superadmin").eq("id", quien.user.id).maybeSingle();
    if (!perfil?.es_superadmin) return fallar("sin_permiso", 403);
    avisos = [{ titulo: "Avisos activados", cuerpo: "Así te va a llegar cada solicitud nueva del formulario.", tag: "prueba" }];
    destino = destino.eq("user_id", quien.user.id);
  } else {
    // Las solicitudes del último día sin avisar. Marcarlas primero evita que dos llamadas avisen lo mismo.
    const { data, error } = await admin.from("solicitudes").update({ avisada_at: new Date().toISOString() })
      .is("avisada_at", null).gte("created_at", new Date(Date.now() - 864e5).toISOString()).select("id,negocio,ciudad");
    if (error) return fallar("no_se_pudo_leer", 500);
    if (!data?.length) return responder({ ok: true, enviados: 0 });
    avisos = data.length > 3
      ? [{ titulo: `${data.length} solicitudes nuevas`, cuerpo: data.map((s) => s.negocio).join(", "), tag: "solicitudes" }]
      : data.map((s) => ({ titulo: "Nueva solicitud", cuerpo: `${s.negocio}${s.ciudad ? ` (${s.ciudad})` : ""} quiere probar De la Casa.`, tag: `solicitud-${s.id}` }));
  }

  const { data: subs } = await destino;
  let enviados = 0;
  for (const s of (subs as Suscripcion[]) ?? []) {
    for (const a of avisos) {
      try {
        const r = await fetch(s.endpoint, {
          method: "POST",
          headers: { Authorization: await vapid(s.endpoint, claves, CONTACTO), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
          body: await cifrar(JSON.stringify(a), s),
        });
        // 404/410: ese celular ya no recibe (borró el ícono o sacó el permiso). Se borra.
        if (r.status === 404 || r.status === 410) { await admin.from("avisos_suscripciones").delete().eq("id", s.id); break; }
        if (r.ok) enviados++;
        else console.error("aviso rechazado", r.status, await r.text());
      } catch (e) { console.error("aviso fallido", e); }
    }
  }
  return responder({ ok: true, enviados });
});
