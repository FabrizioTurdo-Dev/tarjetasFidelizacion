-- Socios fundadores: los primeros 10 negocios que piden la prueba desde el formulario de la página
-- y Fabri habilita ("Crear negocio" en la solicitud). Pagan $10.000 por mes durante 6 meses.
-- No cuentan los negocios creados a mano en Administración ni las solicitudes anteriores a esta migración.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

alter table public.negocios add column fundador boolean not null default false;

-- Las solicitudes que ya estaban quedan afuera (false); las que lleguen desde ahora pueden dar un lugar.
alter table public.solicitudes add column para_fundador boolean not null default false;
alter table public.solicitudes alter column para_fundador set default true;

-- Lugares que quedan (0 a 10). Lo lee la página pública; no muestra nada de los negocios.
create function public.lugares_fundadores() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, 10 - (select count(*) from public.negocios where fundador))::int
$$;

-- Cuando una solicitud nueva queda vinculada a su negocio (negocio_id pasa de vacío a lleno), si queda lugar, es fundador.
-- El candado evita que dos altas al mismo tiempo ocupen el último lugar.
create function app.marcar_fundador() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.para_fundador and new.negocio_id is not null and old.negocio_id is null then
    perform pg_advisory_xact_lock(hashtext('delacasa_fundadores'));
    if (select count(*) from public.negocios where fundador) < 10 then
      update public.negocios set fundador = true where id = new.negocio_id;
    end if;
  end if;
  return new;
end $$;

create trigger solicitudes_fundador after update of negocio_id on public.solicitudes
  for each row execute function app.marcar_fundador();

-- ============ Resumen: marca de fundador y lugares que quedan ============
create or replace function public.resumen_admin() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not app.es_superadmin() then raise exception 'sin_permiso'; end if;
  with por_negocio as (
    select n.id, n.nombre, n.slug, n.estado, n.inicio_prueba, n.rubro, n.interno, n.fundador,
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
    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva'),
    'lugares_fundadores', public.lugares_fundadores()
  ) into r;
  return r;
end $$;

-- ============ Permisos ============
revoke execute on function public.lugares_fundadores() from public;
grant execute on function public.lugares_fundadores() to anon, authenticated;
revoke execute on function app.marcar_fundador() from public, anon, authenticated;
