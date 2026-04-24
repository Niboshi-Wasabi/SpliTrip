-- WebAuthn based two-factor authentication (2FA) tables and policies.
-- WebAuthn ベースの二段階認証（2FA）用テーブルとポリシー。

alter table public.user_profiles
  add column if not exists two_factor_enabled boolean not null default false;

comment on column public.user_profiles.two_factor_enabled is
  'Whether WebAuthn 2FA is required for this user.';

create table if not exists public.user_webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_user_webauthn_credentials_user_id
  on public.user_webauthn_credentials(user_id);

create table if not exists public.user_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_backup_codes_user_id
  on public.user_backup_codes(user_id);

alter table public.user_webauthn_credentials enable row level security;
alter table public.user_backup_codes enable row level security;

drop policy if exists user_webauthn_credentials_select_own on public.user_webauthn_credentials;
create policy user_webauthn_credentials_select_own
on public.user_webauthn_credentials
for select
using (auth.uid() = user_id);

drop policy if exists user_webauthn_credentials_insert_own on public.user_webauthn_credentials;
create policy user_webauthn_credentials_insert_own
on public.user_webauthn_credentials
for insert
with check (auth.uid() = user_id);

drop policy if exists user_webauthn_credentials_update_own on public.user_webauthn_credentials;
create policy user_webauthn_credentials_update_own
on public.user_webauthn_credentials
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_webauthn_credentials_delete_own on public.user_webauthn_credentials;
create policy user_webauthn_credentials_delete_own
on public.user_webauthn_credentials
for delete
using (auth.uid() = user_id);

drop policy if exists user_backup_codes_select_own on public.user_backup_codes;
create policy user_backup_codes_select_own
on public.user_backup_codes
for select
using (auth.uid() = user_id);

drop policy if exists user_backup_codes_insert_own on public.user_backup_codes;
create policy user_backup_codes_insert_own
on public.user_backup_codes
for insert
with check (auth.uid() = user_id);

drop policy if exists user_backup_codes_update_own on public.user_backup_codes;
create policy user_backup_codes_update_own
on public.user_backup_codes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_backup_codes_delete_own on public.user_backup_codes;
create policy user_backup_codes_delete_own
on public.user_backup_codes
for delete
using (auth.uid() = user_id);
