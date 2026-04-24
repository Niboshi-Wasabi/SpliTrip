-- Two-factor authentication security events for audit and lightweight rate limiting.
-- 二段階認証の監査ログと簡易レート制限判定用イベントテーブル。

create table if not exists public.two_factor_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  success boolean not null default false,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_two_factor_security_events_user_action_time
  on public.two_factor_security_events(user_id, action, created_at desc);

create index if not exists idx_two_factor_security_events_action_success_time
  on public.two_factor_security_events(action, success, created_at desc);

alter table public.two_factor_security_events enable row level security;

drop policy if exists two_factor_security_events_select_own on public.two_factor_security_events;
create policy two_factor_security_events_select_own
on public.two_factor_security_events
for select
using (auth.uid() = user_id);

drop policy if exists two_factor_security_events_insert_own on public.two_factor_security_events;
create policy two_factor_security_events_insert_own
on public.two_factor_security_events
for insert
with check (auth.uid() = user_id);
