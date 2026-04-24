-- What's New, runtime system settings, and user read-position for announcements.
-- Public read of selected settings keys; full CRUD for admins only (RLS).

-- ---------------------------------------------------------------------------
-- app_announcements: What's New (bilingual)
-- ---------------------------------------------------------------------------
create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title_ja text not null default '',
  title_en text not null default '',
  content_ja text not null default '',
  content_en text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_announcements_created_at
  on public.app_announcements (created_at desc);

create index if not exists idx_app_announcements_published
  on public.app_announcements (is_published) where is_published = true;

comment on table public.app_announcements is 'Bilingual in-app announcements (What is New).';

alter table public.app_announcements enable row level security;

-- Anyone (anon + authed) can read published rows.
drop policy if exists app_announcements_read_published on public.app_announcements;
create policy app_announcements_read_published
  on public.app_announcements
  for select
  to anon, authenticated
  using (is_published = true);

-- Admins: full access (incl. drafts).
drop policy if exists app_announcements_admin_all on public.app_announcements;
create policy app_announcements_admin_all
  on public.app_announcements
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

grant select, insert, update, delete on public.app_announcements to authenticated;
grant select on public.app_announcements to anon;

-- Keep updated_at fresh
create or replace function public.app_announcements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_app_announcements_updated_at on public.app_announcements;
create trigger tr_app_announcements_updated_at
  before update on public.app_announcements
  for each row
  execute procedure public.app_announcements_set_updated_at();

-- ---------------------------------------------------------------------------
-- system_settings: key-value (jsonb) for maintenance / promo without redeploy
-- ---------------------------------------------------------------------------
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text
);

comment on table public.system_settings is 'Server-driven feature flags and copy (maintenance, banners).';

alter table public.system_settings enable row level security;

-- Public (anon + authed) may read a small set of safe keys (Edge + client).
drop policy if exists system_settings_public_read on public.system_settings;
create policy system_settings_public_read
  on public.system_settings
  for select
  to anon, authenticated
  using (
    key in (
      'maintenance_mode',
      'maintenance_announcement',
      'promo_banner_config'
    )
  );

-- Admins can read/insert/update/delete any key.
drop policy if exists system_settings_admin_all on public.system_settings;
create policy system_settings_admin_all
  on public.system_settings
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

grant select on public.system_settings to anon;
grant select, insert, update, delete on public.system_settings to authenticated;

-- Initial rows (idempotent for key).
insert into public.system_settings (key, value, description) values
  (
    'maintenance_mode',
    jsonb_build_object('enabled', false),
    'When enabled (and no env override), site shows maintenance. Edge reads with anon key.'
  ),
  (
    'maintenance_announcement',
    jsonb_build_object('message', ''),
    'Shown in the amber top banner; empty hides banner.'
  ),
  (
    'promo_banner_config',
    jsonb_build_object(
      'href', '',
      'imageUrl', '',
      'labelJa', '',
      'labelEn', ''
    ),
    'Optional promo / partner slot; dashboard promos can read this.'
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- user_profiles: last read announcement
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists last_seen_announcement_id uuid
    references public.app_announcements (id) on delete set null;

comment on column public.user_profiles.last_seen_announcement_id is
  'Client may advance after showing What is New; optional UX for unread badge.';

notify pgrst, 'reload schema';
