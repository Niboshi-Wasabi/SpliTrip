-- Expense categories, receipt paths, audit trail, and private Storage bucket for receipts.
-- カテゴリ・領収書パス・監査ログ・領収書用プライベート Storage バケット。

-- ---------------------------------------------------------------------------
-- group_expenses: category + receipt storage object path (bucket-relative).
-- category: controlled vocabulary. receipt_url: path inside `receipts` bucket, e.g. "{group_id}/{expense_id}/file.jpg"
-- group_expenses: カテゴリ + Storage 上のオブジェクトパス（バケット相対）。receipt_url は receipts バケット内パス。
-- ---------------------------------------------------------------------------
alter table public.group_expenses
  add column if not exists category text not null default 'other';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'group_expenses_category_check'
      and n.nspname = 'public'
      and t.relname = 'group_expenses'
  ) then
    alter table public.group_expenses
      add constraint group_expenses_category_check
      check (category in ('food', 'transport', 'lodging', 'sightseeing', 'other'));
  end if;
end
$$;

alter table public.group_expenses
  add column if not exists receipt_url text;

comment on column public.group_expenses.category is 'Expense category: food | transport | lodging | sightseeing | other';
comment on column public.group_expenses.receipt_url is 'Storage path under bucket receipts (not a public URL).';

-- ---------------------------------------------------------------------------
-- RPC: extend insert to persist category and optional receipt path.
-- ---------------------------------------------------------------------------
drop function if exists public.insert_expense_with_splits(uuid, uuid, numeric, text, date, jsonb);

create or replace function public.insert_expense_with_splits(
  p_group_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_expense_date date,
  p_splits jsonb,
  p_category text default 'other',
  p_receipt_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  _expense_id uuid;
  _is_member  boolean;
  _cat text;
begin
  select public.is_group_member(p_group_id, auth.uid()) into _is_member;
  if not _is_member then
    raise exception 'forbidden: caller is not a member of this group';
  end if;

  if not public.is_group_member(p_group_id, p_payer_id) then
    raise exception 'invalid_payer: payer is not a member of this group';
  end if;

  _cat := coalesce(nullif(trim(p_category), ''), 'other');
  if _cat not in ('food', 'transport', 'lodging', 'sightseeing', 'other') then
    raise exception 'invalid_category';
  end if;

  insert into public.group_expenses (
    group_id, payer_id, amount, description, expense_date, category, receipt_url
  )
  values (
    p_group_id, p_payer_id, p_amount, p_description, p_expense_date, _cat, p_receipt_url
  )
  returning id into _expense_id;

  insert into public.expense_splits (expense_id, user_id, amount, ratio)
  select
    _expense_id,
    (s->>'user_id')::uuid,
    (s->>'amount')::numeric,
    (s->>'ratio')::numeric
  from jsonb_array_elements(p_splits) as s;

  return _expense_id;
end;
$$;

alter function public.insert_expense_with_splits(uuid, uuid, numeric, text, date, jsonb, text, text)
  set row_security = off;

-- ---------------------------------------------------------------------------
-- audit_logs: append-only change history for group_expenses (insert/update/delete).
-- RLS: members of the group can SELECT. Rows are written only via SECURITY DEFINER trigger (bypasses RLS as table owner).
-- audit_logs: group_expenses の履歴。SELECT はメンバーのみ。INSERT は SECURITY DEFINER トリガー専用。
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  expense_id uuid,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_group_id_idx on public.audit_logs (group_id);
create index if not exists audit_logs_expense_id_idx on public.audit_logs (expense_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

comment on table public.audit_logs is 'Audit trail for group expense changes (who, when, what changed).';

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_member on public.audit_logs;
create policy audit_logs_select_member
on public.audit_logs
for select
to authenticated
using (public.is_group_member(group_id, (select auth.uid())));

grant select on public.audit_logs to authenticated;

create or replace function public.tr_audit_group_expenses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_expense_id uuid;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_group_id := new.group_id;
    v_expense_id := new.id;
    v_payload := jsonb_build_object(
      'row', jsonb_build_object(
        'amount', new.amount,
        'description', new.description,
        'expense_date', new.expense_date,
        'category', new.category,
        'payer_id', new.payer_id,
        'receipt_url', new.receipt_url
      )
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_group_id := new.group_id;
    v_expense_id := new.id;
    v_payload := jsonb_build_object(
      'before', jsonb_build_object(
        'amount', old.amount,
        'description', old.description,
        'expense_date', old.expense_date,
        'category', old.category,
        'payer_id', old.payer_id,
        'receipt_url', old.receipt_url
      ),
      'after', jsonb_build_object(
        'amount', new.amount,
        'description', new.description,
        'expense_date', new.expense_date,
        'category', new.category,
        'payer_id', new.payer_id,
        'receipt_url', new.receipt_url
      )
    );
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_group_id := old.group_id;
    v_expense_id := old.id;
    v_payload := jsonb_build_object(
      'row', jsonb_build_object(
        'amount', old.amount,
        'description', old.description,
        'expense_date', old.expense_date,
        'category', old.category,
        'payer_id', old.payer_id,
        'receipt_url', old.receipt_url
      )
    );
  else
    return null;
  end if;

  insert into public.audit_logs (group_id, expense_id, actor_id, action, payload)
  values (v_group_id, v_expense_id, auth.uid(), v_action, v_payload);

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_group_expenses_audit on public.group_expenses;
create trigger tr_group_expenses_audit
after insert or update or delete on public.group_expenses
for each row execute procedure public.tr_audit_group_expenses();

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Storage: private `receipts` bucket; object paths must start with a folder name
-- equal to a group the user belongs to (enforced via storage.foldername(name)[1]).
-- Storage: 非公開バケット。オブジェクト名の先頭フォルダ = 所属グループ ID。
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receipts_select_members on storage.objects;
create policy receipts_select_members
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

drop policy if exists receipts_insert_members on storage.objects;
create policy receipts_insert_members
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

drop policy if exists receipts_update_members on storage.objects;
create policy receipts_update_members
on storage.objects
for update
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

drop policy if exists receipts_delete_members on storage.objects;
create policy receipts_delete_members
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);
