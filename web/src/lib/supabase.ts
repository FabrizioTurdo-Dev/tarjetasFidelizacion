import { createClient } from "@supabase/supabase-js";

// Claves públicas: la seguridad real la dan las reglas RLS de la base, no el secreto de estas claves.
import { SB_KEY as KEY, SB_URL as URL } from "./rpc";

export const sb = createClient(URL, KEY);
