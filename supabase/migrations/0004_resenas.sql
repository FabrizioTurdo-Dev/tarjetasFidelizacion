-- Botón "Dejar mi reseña en Google" en la tarjeta del cliente.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).
--
-- Reglas de Google: se le pide a todos por igual, sin nada a cambio y sin texto prearmado.
-- Por eso la tarjeta no depende de la reseña y no se pregunta antes si quedó contento.

-- Link "Pedir reseñas" del Perfil de Empresa de Google (ej. https://g.page/r/XXXX/review). Lo carga el superadmin.
alter table public.negocios add column resenas_url text
  check (resenas_url is null or (resenas_url ~ '^https://\S+$' and char_length(resenas_url) <= 300));

-- Qué hizo el cliente con el botón. Google no avisa si la reseña se publicó: solo sabemos si tocó el botón.
alter table public.clientes
  add column resena_abierta_at timestamptz,     -- tocó "Dejar mi reseña en Google"
  add column resena_descartada_at timestamptz;  -- tocó "No, gracias"

-- Igual que en 0001, más el link de reseñas y si hay que mostrar el botón:
-- desde la 2ª visita vigente (ya conoce el lugar) y una sola vez.
create or replace function app.estado_cliente(c public.clientes) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  n public.negocios;
  vencida boolean;
  v int;
  vence timestamptz;
begin
  select * into n from public.negocios where id = c.negocio_id;
  vencida := c.ultima_visita is not null
             and c.ultima_visita + make_interval(days => n.vence_dias) < now();
  v := case when vencida then 0 else c.visitas end;
  vence := case when c.ultima_visita is null or vencida then null
                else c.ultima_visita + make_interval(days => n.vence_dias) end;
  return jsonb_build_object(
    'nombre', c.nombre,
    'numero_socio', c.numero_socio,
    'negocio', jsonb_build_object('nombre', n.nombre, 'color', n.color, 'slug', n.slug, 'logo_url', n.logo_url,
                                  'resenas_url', n.resenas_url),
    'visitas', v,
    'vence_el', vence,
    'vencida', vencida,
    'pedir_resena', n.resenas_url is not null and v >= 2
                    and c.resena_abierta_at is null and c.resena_descartada_at is null,
    'premios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'visitas', p.visitas, 'nombre', p.nombre,
        'ganado', v >= p.visitas,
        'canjeado', (not vencida) and exists (
          select 1 from public.canjes k
          where k.cliente_id = c.id and k.premio_id = p.id and k.ciclo = c.ciclo)
      ) order by p.visitas)
      from public.premios p where p.negocio_id = n.id and p.activo), '[]'::jsonb)
  );
end $$;

-- La tarjeta (sin login, con su token secreto) anota que el cliente tocó el botón o lo descartó.
-- Solo guarda la primera vez; no cambia visitas ni nada más.
create function public.marcar_resena(p_token text, p_abrio boolean) returns void
language sql security definer set search_path = '' as $$
  update public.clientes
     set resena_abierta_at    = case when p_abrio then coalesce(resena_abierta_at, now()) else resena_abierta_at end,
         resena_descartada_at = case when p_abrio then resena_descartada_at else coalesce(resena_descartada_at, now()) end
   where token = p_token;
$$;

revoke execute on function public.marcar_resena(text, boolean) from public, anon, authenticated;
grant execute on function public.marcar_resena(text, boolean) to anon, authenticated;
