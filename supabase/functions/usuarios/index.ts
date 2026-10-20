// Usuarios del negocio (dueños y empleados), desde Administración. Solo el superadmin con 2FA (aal2).
// Crear un usuario de Auth necesita la clave secreta, que nunca puede estar en el navegador: por eso vive acá.
//   { accion: "crear", negocio_id, email, password, rol }  → crea el usuario y lo vincula al negocio
//   { accion: "clave", user_id, password }                 → le pone una contraseña nueva (si se la olvidó)
// Se despliega con verify_jwt = false: la sesión se valida acá adentro (las claves sb_publishable/sb_secret no son JWT).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fallar = (error: string, status = 400) => responder({ error }, status);

const URL = Deno.env.get("SUPABASE_URL")!;
const clave = (nuevas: string, vieja: string) => {
  try { const k = JSON.parse(Deno.env.get(nuevas) || "{}").default; if (k) return k as string; } catch { /* sin claves nuevas */ }
  return Deno.env.get(vieja)!;
};
const PUBLICA = clave("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const SECRETA = clave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

/** Datos del token. Solo se leen después de que Auth confirmó que el token es válido. */
function claims(token: string): Record<string, unknown> {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fallar("metodo_invalido", 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return fallar("sin_permiso", 401);

  const admin = createClient(URL, SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });
  // Cliente con la sesión de quien llama: la base vuelve a chequear el permiso en agregar_miembro.
  const comoUsuario = createClient(URL, PUBLICA, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 1. Quién llama: sesión válida, con 2FA hecho y marcado como superadmin.
  const { data: quien, error: errAuth } = await admin.auth.getUser(token);
  if (errAuth || !quien.user) return fallar("sin_permiso", 401);
  if (claims(token).aal !== "aal2") return fallar("sin_permiso", 403);
  const { data: perfil } = await admin.from("perfiles").select("es_superadmin").eq("id", quien.user.id).maybeSingle();
  if (!perfil?.es_superadmin) return fallar("sin_permiso", 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return fallar("pedido_invalido"); }
  const password = String(b.password ?? "");
  if (password.length < 8) return fallar("clave_corta");

  if (b.accion === "crear") {
    const email = String(b.email ?? "").trim().toLowerCase();
    const rol = b.rol === "dueno" ? "dueno" : b.rol === "empleado" ? "empleado" : "";
    const negocio = String(b.negocio_id ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return fallar("mail_invalido");
    if (!rol || !negocio) return fallar("pedido_invalido");

    const { data: nuevo, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !nuevo.user) return fallar(error?.code || "no_se_pudo_crear");

    const v = await comoUsuario.rpc("agregar_miembro", { p_negocio: negocio, p_email: email, p_rol: rol });
    if (v.error) {
      await admin.auth.admin.deleteUser(nuevo.user.id); // recién creado, sin actividad: no queda un usuario suelto
      return fallar(v.error.message);
    }
    return responder({ ok: true, user_id: nuevo.user.id });
  }

  if (b.accion === "clave") {
    const uid = String(b.user_id ?? "");
    const { data: dest } = await admin.from("perfiles").select("es_superadmin").eq("id", uid).maybeSingle();
    if (!dest) return fallar("usuario_inexistente");
    if (dest.es_superadmin) return fallar("es_superadmin", 403);
    const { error } = await admin.auth.admin.updateUserById(uid, { password });
    if (error) return fallar(error.code || "no_se_pudo_cambiar");
    return responder({ ok: true });
  }

  return fallar("pedido_invalido");
});
