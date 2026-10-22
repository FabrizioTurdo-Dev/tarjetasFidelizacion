-- Lanzamiento: el dueño edita sus premios (con historial), resumen del superadmin y solicitudes de prueba.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

-- ============ Premios: activo, pausado o archivado ============
-- Pausado (activo = false): no se muestra ni se canjea, y el dueño lo puede reactivar.
-- Archivado: se quitó pero ya tenía canjes; queda solo para el historial y no aparece en ningún lado.
alter table public.premios add column archivado_at timestamptz;
-- Hasta ahora un premio inactivo era uno "borrado" que tenía canjes (con visitas corridas a 100000+).
update public.premios set archivado_at = now() where not activo;

-- Las visitas no se repiten entre los premios vigentes (activos o pausados).
alter table public.premios drop constraint premios_negocio_id_visitas_key;
create unique index premios_visitas_vigentes on public.premios (negocio_id, visitas) where archivado_at is null;

-- Cada cambio en los premios: quién, cuándo, cómo estaba y cómo quedó. Lo escribe guardar_premios.
create table public.premios_cambios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  premio_id uuid,                     -- sin FK: el premio pudo borrarse
  accion text not null check (accion in ('alta', 'edicion', 'pausa', 'reactivacion', 'baja')),
  antes jsonb,
  despues jsonb,
  user_id uuid references auth.users (id) on delete set null,
  usuario_email text,
  created_at timestamptz not null default now()
);
create index on public.premios_cambios (negocio_id, created_at desc);
alter table public.premios_cambios enable row level security;
create policy premios_cambios_super on public.premios_cambios for select to authenticated
  using (app.es_superadmin());

-- La escalera completa de un negocio. Dueño o superadmin.
-- p_premios: [{ "id"?: uuid, "visitas": int, "nombre": text, "activo": bool }]. Los que no vienen se quitan:
-- se borran si nunca se canjearon y se archivan si ya se canjearon.
-- Cambiarle el nombre a uno ya canjeado lo archiva y crea uno nuevo, para que el historial no mienta.
create function public.guardar_premios(p_negocio uuid, p_premios jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  it jsonb;
  p public.premios;
  v int;
  nom text;
  act boolean;
  canjeado boolean;
  nuevo uuid;
  quien uuid := auth.uid();
  mail text := auth.jwt() ->> 'email';
  ids uuid[];
begin
  if not (app.es_dueno(p_negocio) or app.es_superadmin()) then raise exception 'sin_permiso'; end if;
  if jsonb_typeof(p_premios) <> 'array' then raise exception 'pedido_invalido'; end if;

  -- Validación de toda la lista antes de tocar nada.
  for it in select * from jsonb_array_elements(p_premios) loop
    v := (it ->> 'visitas')::int;
    nom := trim(coalesce(it ->> 'nombre', ''));
    if v is null or v < 1 or v > 500 then raise exception 'premio_visitas'; end if;
    if char_length(nom) < 1 or char_length(nom) > 80 then raise exception 'premio_nombre'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_premios) e where coalesce((e ->> 'activo')::boolean, true)) > 10 then
    raise exception 'premios_demasiados';
  end if;
  if (select count(distinct (e ->> 'visitas')::int) from jsonb_array_elements(p_premios) e)
     <> jsonb_array_length(p_premios) then
    raise exception 'premios_repetidos';
  end if;
  ids := array(select (e ->> 'id')::uuid from jsonb_array_elements(p_premios) e where e ? 'id' and e ->> 'id' <> '');
  if exists (select 1 from unnest(ids) i where not exists (
      select 1 from public.premios x where x.id = i and x.negocio_id = p_negocio and x.archivado_at is null)) then
    raise exception 'premio_invalido';
  end if;

  -- Los que ya no están: borrar o archivar.
  for p in select * from public.premios
            where negocio_id = p_negocio and archivado_at is null and not (id = any (ids)) loop
    if exists (select 1 from public.canjes k where k.premio_id = p.id) then
      update public.premios set activo = false, archivado_at = now() where id = p.id;
    else
      delete from public.premios where id = p.id;
    end if;
    insert into public.premios_cambios (negocio_id, premio_id, accion, antes, user_id, usuario_email)
    values (p_negocio, p.id, 'baja', jsonb_build_object('visitas', p.visitas, 'nombre', p.nombre), quien, mail);
  end loop;

  -- Corre las visitas de los que quedan para poder intercambiarlas sin chocar con el índice único.
  update public.premios set visitas = visitas + 1000000 where id = any (ids);

  for it in select * from jsonb_array_elements(p_premios) loop
    v := (it ->> 'visitas')::int;
    nom := trim(it ->> 'nombre');
    act := coalesce((it ->> 'activo')::boolean, true);
    if it ? 'id' and it ->> 'id' <> '' then
      select * into p from public.premios where id = (it ->> 'id')::uuid;
      p.visitas := p.visitas - 1000000;
      canjeado := exists (select 1 from public.canjes k where k.premio_id = p.id);
      if canjeado and nom <> p.nombre then
        update public.premios set activo = false, archivado_at = now(), visitas = p.visitas where id = p.id;
        insert into public.premios (negocio_id, visitas, nombre, activo) values (p_negocio, v, nom, act) returning id into nuevo;
        insert into public.premios_cambios (negocio_id, premio_id, accion, antes, despues, user_id, usuario_email)
        values (p_negocio, nuevo, 'edicion', jsonb_build_object('visitas', p.visitas, 'nombre', p.nombre),
                jsonb_build_object('visitas', v, 'nombre', nom, 'activo', act), quien, mail);
      else
        update public.premios set visitas = v, nombre = nom, activo = act where id = p.id;
        if v <> p.visitas or nom <> p.nombre then
          insert into public.premios_cambios (negocio_id, premio_id, accion, antes, despues, user_id, usuario_email)
          values (p_negocio, p.id, 'edicion', jsonb_build_object('visitas', p.visitas, 'nombre', p.nombre),
                  jsonb_build_object('visitas', v, 'nombre', nom), quien, mail);
        end if;
        if act <> p.activo then
          insert into public.premios_cambios (negocio_id, premio_id, accion, despues, user_id, usuario_email)
          values (p_negocio, p.id, case when act then 'reactivacion' else 'pausa' end,
                  jsonb_build_object('visitas', v, 'nombre', nom), quien, mail);
        end if;
      end if;
    else
      insert into public.premios (negocio_id, visitas, nombre, activo) values (p_negocio, v, nom, act) returning id into nuevo;
      insert into public.premios_cambios (negocio_id, premio_id, accion, despues, user_id, usuario_email)
      values (p_negocio, nuevo, 'alta', jsonb_build_object('visitas', v, 'nombre', nom, 'activo', act), quien, mail);
    end if;
  end loop;
end $$;

-- ============ Datos privados de cada negocio (solo superadmin) ============
-- No van en negocios porque los dueños pueden leer su propia fila.
create table public.negocios_privado (
  negocio_id uuid primary key references public.negocios (id) on delete cascade,
  contacto_nombre text check (char_length(contacto_nombre) <= 80),
  contacto_whatsapp text check (char_length(contacto_whatsapp) <= 30),
  notas text check (char_length(notas) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.negocios_privado enable row level security;
create policy negocios_privado_super on public.negocios_privado for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

-- ============ Solicitudes de prueba (formulario público) ============
create type public.estado_solicitud as enum ('nueva', 'contactada', 'habilitada', 'descartada');
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  negocio text not null check (char_length(negocio) between 1 and 80),
  rubro text check (char_length(rubro) <= 60),
  ciudad text check (char_length(ciudad) <= 80),
  pais text check (char_length(pais) <= 60),
  nombre text not null check (char_length(nombre) between 1 and 80),
  whatsapp text not null check (char_length(whatsapp) between 6 and 30),
  email text check (email is null or (char_length(email) <= 120 and email like '%_@_%')),
  como_nos_conocio text check (char_length(como_nos_conocio) <= 200),
  acepta_privacidad_at timestamptz not null default now(),
  ip_hash text,                       -- solo para limitar envíos repetidos; no se guarda la IP
  estado public.estado_solicitud not null default 'nueva',
  negocio_id uuid references public.negocios (id) on delete set null,
  notas text check (char_length(notas) <= 2000),
  created_at timestamptz not null default now()
);
create index on public.solicitudes (created_at desc);
alter table public.solicitudes enable row level security;
create policy solicitudes_super on public.solicitudes for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

-- Formulario "Quiero probarlo" (sin login). p_web es un campo oculto: si viene lleno es un bot y se ignora.
create function public.pedir_prueba(
  p_negocio text, p_rubro text, p_ciudad text, p_pais text, p_nombre text,
  p_whatsapp text, p_email text, p_como text, p_acepta boolean, p_web text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  h text := md5('delacasa:' || ip);
  wa text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g');
begin
  if nullif(trim(p_web), '') is not null then return; end if;
  if not coalesce(p_acepta, false) then raise exception 'falta_aceptar_privacidad'; end if;
  if nullif(trim(p_negocio), '') is null or nullif(trim(p_nombre), '') is null then raise exception 'pedido_invalido'; end if;
  if char_length(regexp_replace(wa, '\D', '', 'g')) < 8 then raise exception 'whatsapp_invalido'; end if;
  -- Límites: 3 por hora desde la misma conexión, 1 por día por WhatsApp, 60 por hora en total.
  if (select count(*) from public.solicitudes where ip_hash = h and created_at > now() - interval '1 hour') >= 3
     or exists (select 1 from public.solicitudes where whatsapp = wa and created_at > now() - interval '1 day')
     or (select count(*) from public.solicitudes where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'demasiados_pedidos';
  end if;
  insert into public.solicitudes (negocio, rubro, ciudad, pais, nombre, whatsapp, email, como_nos_conocio, ip_hash)
  values (trim(p_negocio), nullif(trim(p_rubro), ''), nullif(trim(p_ciudad), ''), nullif(trim(p_pais), ''),
          trim(p_nombre), wa, nullif(lower(trim(p_email)), ''), nullif(trim(p_como), ''), h);
end $$;

-- ============ Resumen del superadmin ============
-- Todo junto en una llamada: totales y una fila por negocio.
create function public.resumen_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not app.es_superadmin() then raise exception 'sin_permiso'; end if;
  with por_negocio as (
    select n.id, n.nombre, n.slug, n.estado, n.inicio_prueba, n.rubro,
      (select count(*) from public.clientes c where c.negocio_id = n.id) as clientes,
      (select count(*) from public.clientes c where c.negocio_id = n.id and c.created_at > now() - interval '30 days') as clientes_30,
      (select count(*) from public.visitas v where v.negocio_id = n.id and v.created_at > now() - interval '30 days') as visitas_30,
      (select count(*) from public.canjes k where k.negocio_id = n.id and k.created_at > now() - interval '30 days') as canjes_30,
      (select max(v.created_at) from public.visitas v where v.negocio_id = n.id) as ultima_visita,
      (select coalesce(jsonb_agg(jsonb_build_object('visitas', p.visitas, 'nombre', p.nombre, 'activo', p.activo) order by p.visitas), '[]'::jsonb)
         from public.premios p where p.negocio_id = n.id and p.archivado_at is null) as premios,
      (select jsonb_build_object('fecha', pc.created_at, 'email', pc.usuario_email, 'accion', pc.accion)
         from public.premios_cambios pc where pc.negocio_id = n.id order by pc.created_at desc limit 1) as ultimo_cambio,
      np.contacto_nombre, np.contacto_whatsapp
    from public.negocios n left join public.negocios_privado np on np.negocio_id = n.id
  )
  select jsonb_build_object(
    'negocios', coalesce((select jsonb_agg(to_jsonb(x) order by x.nombre) from por_negocio x), '[]'::jsonb),
    'clientes_total', (select count(*) from public.clientes),
    'clientes_30', (select count(*) from public.clientes where created_at > now() - interval '30 days'),
    'visitas_30', (select count(*) from public.visitas where created_at > now() - interval '30 days'),
    'canjes_30', (select count(*) from public.canjes where created_at > now() - interval '30 days'),
    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva')
  ) into r;
  return r;
end $$;

-- ============ Permisos ============
revoke execute on function public.guardar_premios(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.pedir_prueba(text, text, text, text, text, text, text, text, boolean, text) from public, anon, authenticated;
revoke execute on function public.resumen_admin() from public, anon, authenticated;
grant execute on function public.guardar_premios(uuid, jsonb) to authenticated;
grant execute on function public.pedir_prueba(text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.resumen_admin() to authenticated;
revoke all on public.premios_cambios, public.negocios_privado, public.solicitudes from anon;
