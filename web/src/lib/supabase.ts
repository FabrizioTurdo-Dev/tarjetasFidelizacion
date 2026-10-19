import { createClient } from "@supabase/supabase-js";

// Claves públicas: la seguridad real la dan las reglas RLS de la base, no el secreto de estas claves.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jswxklihzpbgbzezfnoi.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_zTzypp-pDpMKVqGK1lHutg_ChOMR6Rk";

export const sb = createClient(URL, KEY);
