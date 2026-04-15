-- Stripe webhook idempotency and customer→user linkage for robust retries.
-- Webhook のリトライ耐性（event 重複防止）と customer→user 紐付けを追加。

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Processed Stripe webhook events for idempotency.';

create table if not exists public.stripe_customer_user_links (
  customer_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stripe_customer_user_links is
  'Mapping between Stripe customer_id and auth.users.id for subscription webhooks.';

create unique index if not exists idx_stripe_customer_user_links_user_id
  on public.stripe_customer_user_links(user_id);

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_customer_user_links enable row level security;

do $$ begin
  create policy "stripe_webhook_events_service_role_all"
  on public.stripe_webhook_events
  for all
  to service_role
  using (true)
  with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "stripe_customer_user_links_service_role_all"
  on public.stripe_customer_user_links
  for all
  to service_role
  using (true)
  with check (true);
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
