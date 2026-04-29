-- Public system status (service health indicators) for transparency page + admin edits.

create table if not exists public.system_status (
  service_key text primary key,
  status text not null,
  updated_at timestamptz not null default now(),
  constraint system_status_service_key_nonempty check (char_length(trim(service_key)) > 0),
  constraint system_status_status_check check (
    status in ('operational', 'degraded', 'partial_outage', 'major_outage')
  )
);

comment on table public.system_status is
  'Per-service operational status for public /status page; anon may read.';
comment on column public.system_status.service_key is 'Stable slug (e.g. core_api_database).';
comment on column public.system_status.status is
  'operational | degraded | partial_outage | major_outage';

alter table public.system_status enable row level security;

drop policy if exists system_status_public_read on public.system_status;
create policy system_status_public_read
  on public.system_status
  for select
  to anon, authenticated
  using (true);

drop policy if exists system_status_admin_all on public.system_status;
create policy system_status_admin_all
  on public.system_status
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = (select auth.uid())
        and up.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = (select auth.uid())
        and up.is_admin = true
    )
  );

grant select on public.system_status to anon;
grant select, insert, update, delete on public.system_status to authenticated;

create or replace function public.system_status_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_system_status_updated_at on public.system_status;
create trigger tr_system_status_updated_at
  before insert or update on public.system_status
  for each row
  execute procedure public.system_status_touch_updated_at();

insert into public.system_status (service_key, status)
values
  ('core_api_database', 'operational'),
  ('authentication', 'operational'),
  ('stripe_payments', 'operational'),
  ('receipt_ai', 'operational'),
  ('web_push_notifications', 'operational')
on conflict (service_key) do nothing;

notify pgrst, 'reload schema';
