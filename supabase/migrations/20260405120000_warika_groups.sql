-- ワリカ型: グループ・メンバー・支出・按分（既存 trips/expenses とは別テーブル）
-- PostgreSQL / Supabase 用。ダッシュボードの SQL Editor からも実行可。

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  currency_code text not null default 'JPY',
  created_at timestamptz not null default now()
);

comment on table public.groups is '割り勘グループ（旅行など）';

-- ---------------------------------------------------------------------------
-- group_members
-- ---------------------------------------------------------------------------
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  constraint group_members_role_check check (role in ('owner', 'member'))
);

create index idx_group_members_user_id on public.group_members (user_id);

-- 作成者を owner として自動参加（RLS 適用前に同一トランザクションで有効）
create or replace function public.tr_groups_add_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger tr_groups_add_owner_member
after insert on public.groups
for each row
execute procedure public.tr_groups_add_owner_member();

-- ---------------------------------------------------------------------------
-- group_expenses（要件の expenses に相当。既存 public.expenses と名前衝突を避ける）
-- ---------------------------------------------------------------------------
create table public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  payer_id uuid not null references auth.users (id) on delete restrict,
  amount numeric(14, 2) not null,
  description text,
  expense_date date not null default ((timezone('utc', now())))::date,
  created_at timestamptz not null default now(),
  constraint group_expenses_amount_positive check (amount > 0)
);

create index idx_group_expenses_group_id on public.group_expenses (group_id);

comment on column public.group_expenses.expense_date is '支払日（要件の date に相当）';

-- ---------------------------------------------------------------------------
-- expense_splits
-- ---------------------------------------------------------------------------
create table public.expense_splits (
  expense_id uuid not null references public.group_expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null,
  ratio numeric(20, 8) not null default 1,
  primary key (expense_id, user_id),
  constraint expense_splits_amount_nonnegative check (amount >= 0),
  constraint expense_splits_ratio_nonnegative check (ratio >= 0)
);

create index idx_expense_splits_expense_id on public.expense_splits (expense_id);

-- ---------------------------------------------------------------------------
-- RLS ヘルパー
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.expense_splits enable row level security;

-- groups
create policy "groups_select_for_members"
on public.groups
for select
to authenticated
using (
  created_by = (select auth.uid())
  or public.is_group_member(id, (select auth.uid()))
);

create policy "groups_insert_creator"
on public.groups
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "groups_update_owner"
on public.groups
for update
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

create policy "groups_delete_owner"
on public.groups
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

-- group_members
create policy "group_members_select"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id, (select auth.uid())));

create policy "group_members_insert_by_owner"
on public.group_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

create policy "group_members_delete_by_owner"
on public.group_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

-- group_expenses
create policy "group_expenses_select"
on public.group_expenses
for select
to authenticated
using (public.is_group_member(group_id, (select auth.uid())));

create policy "group_expenses_insert"
on public.group_expenses
for insert
to authenticated
with check (
  public.is_group_member(group_id, (select auth.uid()))
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_expenses.group_id
      and gm.user_id = payer_id
  )
);

create policy "group_expenses_update"
on public.group_expenses
for update
to authenticated
using (public.is_group_member(group_id, (select auth.uid())))
with check (
  public.is_group_member(group_id, (select auth.uid()))
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_expenses.group_id
      and gm.user_id = payer_id
  )
);

create policy "group_expenses_delete"
on public.group_expenses
for delete
to authenticated
using (public.is_group_member(group_id, (select auth.uid())));

-- expense_splits
create policy "expense_splits_select"
on public.expense_splits
for select
to authenticated
using (
  exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
);

create policy "expense_splits_insert"
on public.expense_splits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
  and exists (
    select 1
    from public.group_members gm
    join public.group_expenses e on e.group_id = gm.group_id
    where e.id = expense_splits.expense_id
      and gm.user_id = expense_splits.user_id
  )
);

create policy "expense_splits_update"
on public.expense_splits
for update
to authenticated
using (
  exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
);

create policy "expense_splits_delete"
on public.expense_splits
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
);
