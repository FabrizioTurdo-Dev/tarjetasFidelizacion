-- Buscar una tarjeta por número de socio, para cuando no anda la cámara.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

-- Solo para usuarios del negocio (dueño o empleado) y solo dentro de su negocio.
-- Devuelve el token para que el escáner siga con registrar_visita / canjear_premio como si hubiera leído el QR.
create function public.buscar_socio(p_negocio uuid, p_numero int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.clientes;
begin
  if not app.es_miembro(p_negocio) then raise exception 'sin_permiso'; end if;
  select * into c from public.clientes where negocio_id = p_negocio and numero_socio = p_numero;
  if not found then raise exception 'socio_inexistente'; end if;
  return jsonb_build_object('token', c.token, 'cliente', app.estado_cliente(c));
end $$;

revoke execute on function public.buscar_socio(uuid, int) from public, anon, authenticated;
grant execute on function public.buscar_socio(uuid, int) to authenticated;
