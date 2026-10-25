-- Bloque de información en la tarjeta ("Sobre nosotros" / "Quién está detrás") y negocios internos.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

-- ============ Bloque de información ============
-- Título, un texto corto y hasta 6 links (carta, Instagram, WhatsApp, proyectos…). Es público:
-- lo ve cualquiera que tenga la tarjeta. Lo editan el dueño y el superadmin con guardar_info.
alter table public.negocios
  add column info_titulo text check (char_length(info_titulo) <= 60),
  add column info_texto text check (char_length(info_texto) <= 600),
  add column info_links jsonb not null default '[]'::jsonb check (jsonb_typeof(info_links) = 'array'),
  -- Interno: negocios de De la Casa (demo, el de Fabri). No cuentan en los números del resumen.
  add column interno boolean not null default false;

-- p_links: [{ "texto": text, "detalle"?: text, "url": "https://…" }]
create function public.guardar_info(p_negocio uuid, p_titulo text, p_texto text, p_links jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  it jsonb;
  t text := nullif(trim(coalesce(p_titulo, '')), '');
  x text := nullif(trim(coalesce(p_texto, '')), '');
  links jsonb := '[]'::jsonb;
  lt text;
  ld text;
  lu text;
begin
  if not (app.es_dueno(p_negocio) or app.es_superadmin()) then raise exception 'sin_permiso'; end if;
  if jsonb_typeof(coalesce(p_links, '[]'::jsonb)) <> 'array' then raise exception 'pedido_invalido'; end if;
  if char_length(t) > 60 then raise exception 'info_titulo'; end if;
  if char_length(x) > 600 then raise exception 'info_texto'; end if;
  if jsonb_array_length(coalesce(p_links, '[]'::jsonb)) > 6 then raise exception 'info_links_demasiados'; end if;

  for it in select * from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) loop
    lt := trim(coalesce(it ->> 'texto', ''));
    ld := nullif(trim(coalesce(it ->> 'detalle', '')), '');
    lu := trim(coalesce(it ->> 'url', ''));
    if char_length(lt) < 1 or char_length(lt) > 40 or char_length(ld) > 80 then raise exception 'info_link_texto'; end if;
    -- Solo https: nada de javascript:, data: ni http sin cifrar.
    if char_length(lu) > 300 or lu !~ '^https://[^\s<>"'']+$' then raise exception 'info_link_url'; end if;
    links := links || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('texto', lt, 'detalle', ld, 'url', lu)));
  end loop;

  update public.negocios set info_titulo = t, info_texto = x, info_links = links where id = p_negocio;
end $$;

-- ============ La tarjeta muestra el bloque ============
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
                                  'resenas_url', n.resenas_url,
                                  'info', jsonb_build_object('titulo', n.info_titulo, 'texto', n.info_texto, 'links', n.info_links)),
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

-- ============ Resumen: los internos no suman en los totales ============
create or replace function public.resumen_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not app.es_superadmin() then raise exception 'sin_permiso'; end if;
  with por_negocio as (
    select n.id, n.nombre, n.slug, n.estado, n.inicio_prueba, n.rubro, n.interno,
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
    'negocios', coalesce((select jsonb_agg(to_jsonb(x) order by x.interno, x.nombre) from por_negocio x), '[]'::jsonb),
    'clientes_total', (select coalesce(sum(clientes), 0) from por_negocio where not interno),
    'clientes_30', (select coalesce(sum(clientes_30), 0) from por_negocio where not interno),
    'visitas_30', (select coalesce(sum(visitas_30), 0) from por_negocio where not interno),
    'canjes_30', (select coalesce(sum(canjes_30), 0) from por_negocio where not interno),
    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva')
  ) into r;
  return r;
end $$;

-- ============ Permisos ============
revoke execute on function public.guardar_info(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.guardar_info(uuid, text, text, jsonb) to authenticated;
