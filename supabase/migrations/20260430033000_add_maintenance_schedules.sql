-- Scheduled maintenance windows (DB-driven), with public read and admin write.

create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  is_enabled boolean not null default false,
  start_time timestamptz not null,
  end_time timestamptz not null,
  announcement_message_ja text not null default '',
  announcement_message_en text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_schedules_time_window_check check (end_time > start_time)
);

comment on table public.maintenance_schedules is
  'Scheduled maintenance windows. Used by client-side pre-notice banner and auto redirect.';

alter table public.maintenance_schedules enable row level security;

drop policy if exists maintenance_schedules_public_read on public.maintenance_schedules;
create policy maintenance_schedules_public_read
  on public.maintenance_schedules
  for select
  to anon, authenticated
  using (true);

drop policy if exists maintenance_schedules_admin_all on public.maintenance_schedules;
create policy maintenance_schedules_admin_all
  on public.maintenance_schedules
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

grant select on public.maintenance_schedules to anon;
grant select, insert, update, delete on public.maintenance_schedules to authenticated;

create index if not exists idx_maintenance_schedules_enabled_start
  on public.maintenance_schedules (is_enabled, start_time);

create index if not exists idx_maintenance_schedules_updated_at
  on public.maintenance_schedules (updated_at desc);

create or replace function public.maintenance_schedules_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_maintenance_schedules_updated_at on public.maintenance_schedules;
create trigger tr_maintenance_schedules_updated_at
  before update on public.maintenance_schedules
  for each row
  execute procedure public.maintenance_schedules_set_updated_at();

insert into public.maintenance_schedules (
  is_enabled,
  start_time,
  end_time,
  announcement_message_ja,
  announcement_message_en
)
select
  false,
  now() + interval '7 day',
  now() + interval '7 day' + interval '1 hour',
  '',
  ''
where not exists (
  select 1 from public.maintenance_schedules
);

notify pgrst, 'reload schema';
