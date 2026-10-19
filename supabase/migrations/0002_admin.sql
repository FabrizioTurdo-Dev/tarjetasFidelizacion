-- Funciones de administración y perfil automático.

-- Las notas privadas no van en negocios: los dueños pueden leer su fila.
alter table public.negocios drop column notas;

-- Cada usuario nuevo de Auth tiene su perfil (es_superadmin siempre false al crearse).
create function app.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre) values (new.id, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.crear_perfil();
insert into public.perfiles (id, nombre)
  select id, split_part(email, '@', 1) from auth.users on conflict do nothing;

-- Vincular un usuario existente (por mail) a un negocio. Solo superadmin.
create function public.agregar_miembro(p_negocio uuid, p_email text, p_rol public.rol_negocio)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if not app.es_superadmin() then raise exception 'sin_permiso'; end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then raise exception 'usuario_inexistente'; end if;
  insert into public.miembros (negocio_id, user_id, rol) values (p_negocio, u, p_rol)
  on conflict (negocio_id, user_id) do update set rol = excluded.rol;
end $$;

create function public.quitar_miembro(p_negocio uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.es_superadmin() then raise exception 'sin_permiso'; end if;
  delete from public.miembros where negocio_id = p_negocio and user_id = p_user;
end $$;

-- Lista de miembros con mail (auth.users no es legible desde la API). Superadmin o dueño.
create function public.listar_miembros(p_negocio uuid)
returns table (user_id uuid, email text, rol public.rol_negocio)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.es_superadmin() or app.es_dueno(p_negocio)) then raise exception 'sin_permiso'; end if;
  return query select m.user_id, u.email::text, m.rol
    from public.miembros m join auth.users u on u.id = m.user_id
    where m.negocio_id = p_negocio order by m.rol, u.email;
end $$;

-- Datos públicos del negocio para la pantalla de alta (nombre y color; nada más).
create function public.negocio_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nombre', n.nombre, 'color', n.color, 'operativo', app.negocio_operativo(n))
  from public.negocios n where n.slug = lower(p_slug);
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.negocio_publico(text) to anon, authenticated;
grant execute on function public.alta_cliente(text, text, text, text, date, boolean) to anon, authenticated;
grant execute on function public.tarjeta_por_token(text) to anon, authenticated;
grant execute on function public.ver_cliente(text) to authenticated;
grant execute on function public.registrar_visita(text) to authenticated;
grant execute on function public.canjear_premio(text, uuid) to authenticated;
grant execute on function public.agregar_miembro(uuid, text, public.rol_negocio) to authenticated;
grant execute on function public.quitar_miembro(uuid, uuid) to authenticated;
grant execute on function public.listar_miembros(uuid) to authenticated;
