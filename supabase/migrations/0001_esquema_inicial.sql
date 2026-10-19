-- Esquema inicial de la tarjeta de fidelización. NO aplicado todavía: revisar antes.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

-- ============ Tipos ============
create type public.estado_negocio as enum ('prueba', 'activa', 'vencida', 'suspendida', 'cancelada');
create type public.rol_negocio as enum ('dueno', 'empleado');

-- ============ Tablas ============
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  es_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  nombre text not null check (char_length(nombre) between 1 and 80),
  rubro text,
  color text not null default '#2f5d50' check (color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  espera_horas int not null default 6 check (espera_horas between 0 and 72),
  vence_dias int not null default 60 check (vence_dias between 7 and 365),
  estado public.estado_negocio not null default 'prueba',
  inicio_prueba date not null default current_date,
  ultimo_socio int not null default 0,
  notas text,                       -- solo para vos (cobros, contacto)
  created_at timestamptz not null default now()
);

create table public.miembros (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol public.rol_negocio not null default 'empleado',
  created_at timestamptz not null default now(),
  primary key (negocio_id, user_id)
);
create index on public.miembros (user_id);

-- Escalera de premios: cada fila es "a las N visitas, este premio".
create table public.premios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  visitas int not null check (visitas > 0),
  nombre text not null check (char_length(nombre) between 1 and 80),
  activo boolean not null default true,
  unique (negocio_id, visitas)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  numero_socio int not null,
  nombre text not null check (char_length(nombre) between 1 and 80),
  telefono text check (telefono is null or char_length(telefono) between 6 and 20),
  email text check (email is null or (char_length(email) <= 120 and email like '%_@_%')),
  cumple date,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  acepta_privacidad_at timestamptz not null default now(),
  visitas int not null default 0,
  ciclo int not null default 1,     -- sube cuando la tarjeta vence y el contador se reinicia
  ultima_visita timestamptz,
  created_at timestamptz not null default now(),
  unique (negocio_id, numero_socio),
  check (telefono is not null or email is not null)
);
create unique index on public.clientes (negocio_id, telefono) where telefono is not null;
create unique index on public.clientes (negocio_id, lower(email)) where email is not null;

create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  registrada_por uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.visitas (negocio_id, created_at desc);
create index on public.visitas (cliente_id);

create table public.canjes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  premio_id uuid not null references public.premios (id),
  ciclo int not null,
  registrado_por uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (cliente_id, premio_id, ciclo)   -- cada premio se canjea una vez por ciclo
);
create index on public.canjes (negocio_id, created_at desc);

-- ============ Funciones auxiliares (schema privado, no expuesto por la API) ============
create schema if not exists app;
grant usage on schema app to authenticated, anon;

-- Superadmin = marcado en perfiles Y con sesión 2FA (aal2).
create function app.es_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and exists (select 1 from public.perfiles p
                 where p.id = (select auth.uid()) and p.es_superadmin);
$$;

create function app.es_miembro(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m
                 where m.negocio_id = n and m.user_id = (select auth.uid()));
$$;

create function app.es_dueno(n uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros m
                 where m.negocio_id = n and m.user_id = (select auth.uid()) and m.rol = 'dueno');
$$;

-- Un negocio opera si está activa, en prueba vigente (30 días) o vencida (gracia manual).
create function app.negocio_operativo(n public.negocios) returns boolean
language sql stable set search_path = '' as $$
  select n.estado in ('activa', 'vencida')
      or (n.estado = 'prueba' and n.inicio_prueba + 30 >= current_date);
$$;

-- Lo que ve el cliente (y el empleado al escanear): visitas vigentes, vencimiento y premios.
create function app.estado_cliente(c public.clientes) returns jsonb
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
    'negocio', jsonb_build_object('nombre', n.nombre, 'color', n.color, 'slug', n.slug, 'logo_url', n.logo_url),
    'visitas', v,
    'vence_el', vence,
    'vencida', vencida,
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

-- ============ Funciones que usa la app (RPC) ============

-- Alta del cliente final desde el QR del negocio (sin login).
create function public.alta_cliente(
  p_slug text, p_nombre text, p_telefono text, p_email text, p_cumple date, p_acepta boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n public.negocios;
  socio int;
  tok text;
begin
  if not coalesce(p_acepta, false) then raise exception 'falta_aceptar_privacidad'; end if;
  select * into n from public.negocios where slug = lower(p_slug);
  if not found or not app.negocio_operativo(n) then raise exception 'negocio_no_disponible'; end if;
  if nullif(trim(p_telefono), '') is null and nullif(trim(p_email), '') is null then
    raise exception 'falta_contacto';
  end if;

  update public.negocios set ultimo_socio = ultimo_socio + 1
   where id = n.id returning ultimo_socio into socio;

  begin
    insert into public.clientes (negocio_id, numero_socio, nombre, telefono, email, cumple)
    values (n.id, socio, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_email), ''), p_cumple)
    returning token into tok;
  exception when unique_violation then
    raise exception 'ya_registrado';
  end;
  return tok;
end $$;

-- Tarjeta web del cliente (link secreto /t/<token>).
create function public.tarjeta_por_token(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.clientes;
begin
  select * into c from public.clientes where token = p_token;
  if not found then raise exception 'tarjeta_invalida'; end if;
  return app.estado_cliente(c);
end $$;

-- El empleado escanea y ve al cliente (sin sumar).
create function public.ver_cliente(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.clientes;
begin
  select * into c from public.clientes where token = p_token;
  if not found then raise exception 'tarjeta_invalida'; end if;
  if not app.es_miembro(c.negocio_id) then raise exception 'sin_permiso'; end if;
  return app.estado_cliente(c);
end $$;

-- Suma una visita respetando espera y vencimiento por inactividad.
create function public.registrar_visita(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes;
  n public.negocios;
  ahora timestamptz := now();
  reinicio boolean := false;
begin
  select * into c from public.clientes where token = p_token for update;
  if not found then raise exception 'tarjeta_invalida'; end if;
  select * into n from public.negocios where id = c.negocio_id;
  if not app.es_miembro(n.id) then raise exception 'sin_permiso'; end if;
  if not app.negocio_operativo(n) then raise exception 'negocio_inactivo'; end if;

  if c.ultima_visita is not null
     and c.ultima_visita + make_interval(hours => n.espera_horas) > ahora then
    return jsonb_build_object('registrada', false, 'motivo', 'espera',
      'proxima', c.ultima_visita + make_interval(hours => n.espera_horas),
      'cliente', app.estado_cliente(c));
  end if;

  if c.ultima_visita is not null
     and c.ultima_visita + make_interval(days => n.vence_dias) < ahora then
    c.visitas := 0; c.ciclo := c.ciclo + 1; reinicio := true;
  end if;

  update public.clientes
     set visitas = c.visitas + 1, ciclo = c.ciclo, ultima_visita = ahora
   where id = c.id returning * into c;
  insert into public.visitas (cliente_id, negocio_id, registrada_por)
  values (c.id, c.negocio_id, auth.uid());

  return jsonb_build_object('registrada', true, 'reinicio', reinicio, 'cliente', app.estado_cliente(c));
end $$;

-- Entrega un premio ganado. No descuenta visitas; cada premio una vez por ciclo.
create function public.canjear_premio(p_token text, p_premio_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.clientes;
  n public.negocios;
  p public.premios;
begin
  select * into c from public.clientes where token = p_token for update;
  if not found then raise exception 'tarjeta_invalida'; end if;
  select * into n from public.negocios where id = c.negocio_id;
  if not app.es_miembro(n.id) then raise exception 'sin_permiso'; end if;
  if not app.negocio_operativo(n) then raise exception 'negocio_inactivo'; end if;
  if c.ultima_visita is null
     or c.ultima_visita + make_interval(days => n.vence_dias) < now() then
    raise exception 'tarjeta_vencida';
  end if;

  select * into p from public.premios
   where id = p_premio_id and negocio_id = n.id and activo;
  if not found then raise exception 'premio_invalido'; end if;
  if c.visitas < p.visitas then raise exception 'visitas_insuficientes'; end if;

  begin
    insert into public.canjes (cliente_id, negocio_id, premio_id, ciclo, registrado_por)
    values (c.id, n.id, p.id, c.ciclo, auth.uid());
  exception when unique_violation then
    raise exception 'ya_canjeado';
  end;
  return app.estado_cliente(c);
end $$;

-- Quién puede llamar a cada función
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema app from public;
grant execute on function public.alta_cliente(text, text, text, text, date, boolean) to anon, authenticated;
grant execute on function public.tarjeta_por_token(text) to anon, authenticated;
grant execute on function public.ver_cliente(text) to authenticated;
grant execute on function public.registrar_visita(text) to authenticated;
grant execute on function public.canjear_premio(text, uuid) to authenticated;
grant execute on function app.es_superadmin(), app.es_miembro(uuid), app.es_dueno(uuid) to authenticated;

-- ============ RLS ============
alter table public.perfiles  enable row level security;
alter table public.negocios  enable row level security;
alter table public.miembros  enable row level security;
alter table public.premios   enable row level security;
alter table public.clientes  enable row level security;
alter table public.visitas   enable row level security;
alter table public.canjes    enable row level security;

-- El público (anon) no toca tablas: solo las dos funciones de arriba.
revoke all on all tables in schema public from anon;
-- clientes, visitas y canjes solo se escriben por funciones (no por la API directa).
revoke insert, update, delete on public.clientes, public.visitas, public.canjes from authenticated;

create policy perfiles_propio on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or app.es_superadmin());
create policy perfiles_super on public.perfiles for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

create policy negocios_ver on public.negocios for select to authenticated
  using (app.es_miembro(id) or app.es_superadmin());
create policy negocios_super on public.negocios for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

create policy miembros_ver on public.miembros for select to authenticated
  using (user_id = (select auth.uid()) or app.es_dueno(negocio_id) or app.es_superadmin());
create policy miembros_super on public.miembros for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

create policy premios_ver on public.premios for select to authenticated
  using (app.es_miembro(negocio_id) or app.es_superadmin());
create policy premios_super on public.premios for all to authenticated
  using (app.es_superadmin()) with check (app.es_superadmin());

-- La lista de clientes es del dueño (el empleado ve al cliente al escanear, vía ver_cliente).
create policy clientes_ver on public.clientes for select to authenticated
  using (app.es_dueno(negocio_id) or app.es_superadmin());
create policy visitas_ver on public.visitas for select to authenticated
  using (app.es_dueno(negocio_id) or app.es_superadmin());
create policy canjes_ver on public.canjes for select to authenticated
  using (app.es_dueno(negocio_id) or app.es_superadmin());
