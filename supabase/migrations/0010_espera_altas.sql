-- Cuando el alta choca con el límite (0009), la base dice cuántos segundos faltan para poder anotarse de nuevo,
-- así la pantalla de alta muestra una cuenta regresiva. Va en el "detail" del error 'demasiadas_altas'.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

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
  espera interval;
begin
  if not coalesce(p_acepta, false) then raise exception 'falta_aceptar_privacidad'; end if;
  select * into n from public.negocios where slug = lower(p_slug);
  if not found or not app.negocio_operativo(n) then raise exception 'negocio_no_disponible'; end if;
  if nullif(trim(p_telefono), '') is null and nullif(trim(p_email), '') is null then
    raise exception 'falta_contacto';
  end if;

  -- Se libera un lugar cuando la alta más vieja de la última hora cumple la hora.
  if ip <> '' and (select count(*) from public.clientes
                    where alta_ip_hash = h and created_at > now() - interval '1 hour') >= 20 then
    select min(created_at) + interval '1 hour' - now() into espera
      from public.clientes where alta_ip_hash = h and created_at > now() - interval '1 hour';
  end if;
  if (select count(*) from public.clientes
       where negocio_id = n.id and created_at > now() - interval '1 hour') >= 200 then
    select greatest(espera, min(created_at) + interval '1 hour' - now()) into espera
      from public.clientes where negocio_id = n.id and created_at > now() - interval '1 hour';
  end if;
  if espera is not null then
    raise exception 'demasiadas_altas' using detail = greatest(1, ceil(extract(epoch from espera)))::int::text;
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
