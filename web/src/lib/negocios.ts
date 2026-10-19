import { sb } from "./supabase";
import type { Negocio } from "./util";

/**
 * Negocios que le corresponden a este usuario: solo aquellos donde está vinculado como dueño o empleado.
 * (La base ya lo garantiza con RLS; esto además evita que el superadmin vea todos mezclados en el panel.)
 * Con ?n=<slug> el superadmin puede abrir el panel de un negocio puntual para revisarlo.
 */
export async function negociosDelUsuario(uid: string, slugForzado?: string | null): Promise<Negocio[]> {
  if (slugForzado) {
    const { data } = await sb.from("negocios").select("*").eq("slug", slugForzado).maybeSingle();
    if (data) return [data as Negocio];
  }
  const { data } = await sb.from("miembros").select("negocios(*)").eq("user_id", uid);
  return ((data ?? []) as unknown as { negocios: Negocio | null }[])
    .map((m) => m.negocios).filter((n): n is Negocio => !!n);
}
