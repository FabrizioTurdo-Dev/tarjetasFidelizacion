-- Avisos al celular del superadmin (notificaciones web) cuando alguien completa el formulario "Quiero probarlo".
-- Al entrar una solicitud, la base llama a la Edge Function "avisos"; la función busca las solicitudes que no se
-- avisaron, las marca y manda la notificación a cada celular anotado acá.
-- Destino: proyecto Supabase "tarjeta-fidelizacion" (jswxklihzpbgbzezfnoi).

create extension if not exists pg_net with schema extensions;

-- Celulares (o navegadores) donde el superadmin activó los avisos desde Administración.
create table public.avisos_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.avisos_suscripciones enable row level security;
create policy avisos_propias on public.avisos_suscripciones for all to authenticated
  using (user_id = (select auth.uid()) and app.es_superadmin())
  with check (user_id = (select auth.uid()) and app.es_superadmin());
revoke all on public.avisos_suscripciones from anon;

-- Cuándo se avisó cada solicitud. Las que ya estaban cuentan como avisadas (el valor por defecto las completa
-- al crear la columna); las nuevas llegan vacías.
alter table public.solicitudes add column avisada_at timestamptz default now();
alter table public.solicitudes alter column avisada_at drop default;

-- Asíncrono (pg_net): el formulario no espera al aviso, y si algo falla la solicitud se guarda igual.
-- No manda datos ni credenciales: la función lee ella misma lo que falta avisar.
create function app.avisar_solicitud() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform net.http_post(
      url := 'https://jswxklihzpbgbzezfnoi.supabase.co/functions/v1/avisos',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb);
  exception when others then null;
  end;
  return null;
end $$;

create trigger solicitudes_aviso after insert on public.solicitudes
  for each statement execute function app.avisar_solicitud();

revoke execute on function app.avisar_solicitud() from public, anon, authenticated;
