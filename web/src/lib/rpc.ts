// Dirección y clave pública de Supabase, y una llamada liviana a funciones públicas de la base.
// La página principal usa rpcPublica en vez del cliente de Supabase: así no descarga ~240 KB de JavaScript
// para dos llamadas (cupo de fundadores y formulario). La seguridad la dan las reglas RLS, no el secreto de la clave.
export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jswxklihzpbgbzezfnoi.supabase.co";
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_zTzypp-pDpMKVqGK1lHutg_ChOMR6Rk";

export async function rpcPublica<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const texto = await r.text();
    const json = texto ? JSON.parse(texto) : null;
    if (!r.ok) return { data: null, error: { message: json?.message || `Error ${r.status}` } };
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}
