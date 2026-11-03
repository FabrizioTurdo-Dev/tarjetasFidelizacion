-- Límite de altas de clientes (para que nadie cargue tarjetas falsas en masa con un programa) e índices que
-- marcó el analizador de rendimiento de Supabase en claves foráneas.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

-- Solo para limitar altas repetidas desde la misma conexión; no se guarda la IP (igual que en solicitudes).
alter table public.clientes add column alta_ip_hash text;

create index clientes_alta_ip_hash_created_at_idx on public.clientes (alta_ip_hash, created_at desc)
  where alta_ip_hash is not null;
create index clientes_negocio_id_created_at_idx on public.clientes (negocio_id, created_at desc);

-- Hasta 20 altas por hora desde la misma conexión (alcanza para el wifi de un local lleno)
-- y 200 por hora en un mismo negocio.
create or replace function public.alta_cliente(
  p_slug text, p_nombre text, p_telefono text, p_email text, p_cumple date, p_acepta boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n public.negocios;
  socio int;
  tok text;
  ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  h text := md5('delacasa:' || ip);
begin
  if not coalesce(p_acepta, false) then raise exception 'falta_aceptar_privacidad'; end if;
  select * into n from public.negocios where slug = lower(p_slug);
  if not found or not app.negocio_operativo(n) then raise exception 'negocio_no_disponible'; end if;
  if nullif(trim(p_telefono), '') is null and nullif(trim(p_email), '') is null then
    raise exception 'falta_contacto';
  end if;
  if (ip <> '' and (select count(*) from public.clientes
                     where alta_ip_hash = h and created_at > now() - interval '1 hour') >= 20)
     or (select count(*) from public.clientes
          where negocio_id = n.id and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'demasiadas_altas';
  end if;

  update public.negocios set ultimo_socio = ultimo_socio + 1
   where id = n.id returning ultimo_socio into socio;

  begin
    insert into public.clientes (negocio_id, numero_socio, nombre, telefono, email, cumple, alta_ip_hash)
    values (n.id, socio, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_email), ''), p_cumple,
            case when ip <> '' then h end)
    returning token into tok;
  exception when unique_violation then
    raise exception 'ya_registrado';
  end;
  return tok;
end $$;

-- Claves foráneas sin índice (analizador de Supabase).
create index avisos_suscripciones_user_id_idx on public.avisos_suscripciones (user_id);
create index canjes_premio_id_idx on public.canjes (premio_id);
create index canjes_registrado_por_idx on public.canjes (registrado_por);
create index premios_cambios_user_id_idx on public.premios_cambios (user_id);
create index solicitudes_negocio_id_idx on public.solicitudes (negocio_id);
create index visitas_registrada_por_idx on public.visitas (registrada_por);

-- El límite de pedir_prueba cuenta por ip_hash en cada envío.
create index solicitudes_ip_hash_created_at_idx on public.solicitudes (ip_hash, created_at desc);
