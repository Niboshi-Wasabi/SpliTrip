-- Persist settlement "mark as paid" + snapshot FX on expenses for non-JPY groups.
-- 送金済みマークの永続化と、外貨グループ出費時の参考レート保存。

-- ---------------------------------------------------------------------------
-- settlement_transactions
-- ---------------------------------------------------------------------------
create table if not exists public.settlement_transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null,
  to_user_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency_code text not null,
  status text not null default 'paid' check (status in ('paid', 'void')),
  marked_by_user_id uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint settlement_transactions_distinct_pair check (from_user_id <> to_user_id)
);

create unique index if not exists settlement_transactions_active_pair_unique
  on public.settlement_transactions (group_id, from_user_id, to_user_id)
  where status = 'paid';

create index if not exists idx_settlement_transactions_group_id
  on public.settlement_transactions (group_id);

comment on table public.settlement_transactions is
  'Per-group directed transfer marked paid by debtor; amount snapshot at mark time.';

alter table public.settlement_transactions enable row level security;

create policy "settlement_transactions_select_members"
on public.settlement_transactions
for select
to authenticated
using (public.is_group_member(group_id, auth.uid()));

create policy "settlement_transactions_insert_debtor"
on public.settlement_transactions
for insert
to authenticated
with check (
  public.is_group_member(group_id, auth.uid())
  and marked_by_user_id = auth.uid()
  and from_user_id = auth.uid()
  and public.is_group_member(group_id, from_user_id)
  and public.is_group_member(group_id, to_user_id)
  and status = 'paid'
);

create policy "settlement_transactions_update_void_debtor_or_owner"
on public.settlement_transactions
for update
to authenticated
using (
  public.is_group_member(group_id, auth.uid())
  and (
    from_user_id = auth.uid()
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = settlement_transactions.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'owner'
    )
  )
)
with check (status in ('paid', 'void'));

-- ---------------------------------------------------------------------------
-- group_expenses: optional JPY reference snapshot at insert time
-- ---------------------------------------------------------------------------
alter table public.group_expenses
  add column if not exists reference_currency_code text;

alter table public.group_expenses
  add column if not exists reference_exchange_rate numeric(20, 8);

alter table public.group_expenses
  add column if not exists reference_converted_amount numeric(14, 2);

comment on column public.group_expenses.reference_currency_code is
  'Quote currency for FX snapshot (typically JPY when group currency is foreign).';
comment on column public.group_expenses.reference_exchange_rate is
  'Rate from group currency to reference_currency_code at expense creation.';
comment on column public.group_expenses.reference_converted_amount is
  'amount * reference_exchange_rate rounded for display.';
