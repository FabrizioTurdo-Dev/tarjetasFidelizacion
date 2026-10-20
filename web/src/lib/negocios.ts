import { sb } from "./supabase";
import type { Negocio } from "./util";

/** rol: el del usuario en ese negocio (vacío cuando el superadmin abre un negocio ajeno con ?n=). */
export type NegocioUsuario = Negocio & { rol?: "dueno" | "empleado" };

/**
 * Negocios que le corresponden a este usuario: solo aquellos donde está vinculado como dueño o empleado.
 * (La base ya lo garantiza con RLS; esto además evita que el superadmin vea todos mezclados en el panel.)
 * Con ?n=<slug> el superadmin puede abrir el panel de un negocio puntual para revisarlo.
 */
export async function negociosDelUsuario(uid: string, slugForzado?: string | null): Promise<NegocioUsuario[]> {
  if (slugForzado) {
    const { data } = await sb.from("negocios").select("*").eq("slug", slugForzado).maybeSingle();
    if (data) return [data as Negocio];
  }
  const { data } = await sb.from("miembros").select("rol, negocios(*)").eq("user_id", uid);
  return ((data ?? []) as unknown as { rol: "dueno" | "empleado"; negocios: Negocio | null }[])
    .filter((m) => m.negocios).map((m) => ({ ...m.negocios!, rol: m.rol }));
}
