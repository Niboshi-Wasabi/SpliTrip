-- Admin control panel foundation:
-- 1) add user_profiles.is_admin
-- 2) create admin_audit_logs
-- 3) enable RLS and allow only admins to SELECT

alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.user_profiles.is_admin is
  'Whether the user can access admin control panel features.';

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);

create index if not exists idx_admin_audit_logs_admin_user_id
  on public.admin_audit_logs (admin_user_id);

create index if not exists idx_admin_audit_logs_target_user_id
  on public.admin_audit_logs (target_user_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists admin_audit_logs_select_admin_only on public.admin_audit_logs;
create policy admin_audit_logs_select_admin_only
on public.admin_audit_logs
for select
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
);

grant select on public.admin_audit_logs to authenticated;
