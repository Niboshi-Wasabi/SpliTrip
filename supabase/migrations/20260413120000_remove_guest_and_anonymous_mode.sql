-- ゲスト（匿名サインイン）モード廃止: is_guest 列・匿名 RLS・auth_jwt_is_anonymous・関連 RPC を整理する。
-- アプリは永続ログイン（OAuth / メール等）のみを想定する。

-- ---------------------------------------------------------------------------
-- 1) 匿名判定を参照する RPC を置換（auth_jwt_is_anonymous 削除前に必須）
-- ---------------------------------------------------------------------------
drop function if exists public.set_own_member_guest_flag(uuid, boolean);

create or replace function public.join_group_by_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_group_id uuid;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select g.id
  into v_group_id
  from public.groups g
  where g.invite_token = p_token
  limit 1;

  if v_group_id is null then
    return null;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function public.create_group_with_invite(
  p_name text,
  p_currency text
)
returns table (
  id uuid,
  name text,
  currency_code text,
  created_at timestamptz,
  invite_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_currency text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required';
  end if;

  v_currency := upper(trim(coalesce(p_currency, 'JPY')));
  if length(v_currency) < 3 then
    v_currency := 'JPY';
  else
    v_currency := left(v_currency, 3);
  end if;

  return query
  insert into public.groups (name, created_by, currency_code)
  values (trim(p_name), v_uid, v_currency)
  returning
    public.groups.id,
    public.groups.name,
    public.groups.currency_code,
    public.groups.created_at,
    public.groups.invite_token;
end;
$$;

create or replace function public.insert_expense_with_splits(
  p_group_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_expense_date date,
  p_splits jsonb,
  p_category text default 'other',
  p_receipt_url text default null,
  p_split_type public.expense_split_mode default 'EQUAL'
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
    group_id, payer_id, amount, description, expense_date, category, receipt_url, split_type
  )
  values (
    p_group_id, p_payer_id, p_amount, p_description, p_expense_date, _cat, p_receipt_url,
    coalesce(p_split_type, 'EQUAL')
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

do $alter_ins$
declare
  function_signature_record record;
begin
  for function_signature_record in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'insert_expense_with_splits'
      and n.nspname = 'public'
  loop
    execute format(
      'alter function %s set row_security to off',
      function_signature_record.sig
    );
  end loop;
end
$alter_ins$;

create or replace function public.update_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (auth.uid(), p_display_name)
  on conflict (id)
  do update set display_name = excluded.display_name;
end;
$$;

create or replace function public.upsert_user_profile(
  p_display_name text,
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (auth.uid(), p_display_name, p_avatar_url)
  on conflict (id)
  do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;
end;
$$;

create or replace function public.update_own_payment_methods(
  p_paypal_me_id text,
  p_cash_app_cashtag text,
  p_payment_links jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  _links jsonb;
begin
  if p_payment_links is null then
    _links := null;
  elsif jsonb_typeof(p_payment_links) <> 'array' then
    _links := '[]'::jsonb;
  else
    _links := p_payment_links;
  end if;

  insert into public.user_profiles (id, display_name, paypal_me_id, cash_app_cashtag, payment_links)
  values (auth.uid(), 'ユーザー', p_paypal_me_id, p_cash_app_cashtag, coalesce(_links, '[]'::jsonb))
  on conflict (id) do update set
    paypal_me_id = excluded.paypal_me_id,
    cash_app_cashtag = excluded.cash_app_cashtag,
    payment_links = case
      when _links is null then public.user_profiles.payment_links
      else excluded.payment_links
    end;
end;
$$;

create or replace function public.update_own_preferred_language(p_language text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, preferred_language)
  values (auth.uid(), 'ユーザー', p_language)
  on conflict (id)
  do update set preferred_language = excluded.preferred_language;
end;
$$;

create or replace function public.increment_ocr_usage_if_not_premium()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, ocr_usage_count, premium_access)
  values (auth.uid(), 'ユーザー', 1, false)
  on conflict (id) do update set
    ocr_usage_count = case
      when coalesce(user_profiles.premium_access, false) then user_profiles.ocr_usage_count
      else user_profiles.ocr_usage_count + 1
    end;
end;
$$;

create or replace function public.mark_pitch_deck_seen()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, pitch_deck_seen_at)
  values (auth.uid(), 'ユーザー', now())
  on conflict (id) do update set pitch_deck_seen_at = now();
end;
$$;

drop function if exists public.get_group_member_profiles(uuid);

create or replace function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  paypal_me_id text,
  cash_app_cashtag text,
  payment_links jsonb
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    up.id,
    coalesce(up.display_name, 'ユーザー'),
    up.avatar_url,
    up.paypal_me_id,
    up.cash_app_cashtag,
    coalesce(up.payment_links, '[]'::jsonb)
  from public.group_members gm
  join public.user_profiles up on up.id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id, auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 2) group_members.is_guest 列削除
-- ---------------------------------------------------------------------------
alter table public.group_members
  drop column if exists is_guest;

-- ---------------------------------------------------------------------------
-- 3) auth_jwt_is_anonymous 削除（ポリシーは上記で置換済みであること）
-- ---------------------------------------------------------------------------
drop function if exists public.auth_jwt_is_anonymous();

-- ---------------------------------------------------------------------------
-- 4) RESTRICTIVE 匿名ブロックをすべて削除
-- ---------------------------------------------------------------------------
drop policy if exists ra_groups_block_anon_ins on public.groups;
drop policy if exists ra_groups_block_anon_upd on public.groups;
drop policy if exists ra_groups_block_anon_del on public.groups;
drop policy if exists ra_group_members_block_anon_ins on public.group_members;
drop policy if exists ra_group_members_block_anon_del on public.group_members;
drop policy if exists ra_group_expenses_block_anon_ins on public.group_expenses;
drop policy if exists ra_group_expenses_block_anon_upd on public.group_expenses;
drop policy if exists ra_group_expenses_block_anon_del on public.group_expenses;
drop policy if exists ra_expense_splits_block_anon_ins on public.expense_splits;
drop policy if exists ra_expense_splits_block_anon_upd on public.expense_splits;
drop policy if exists ra_expense_splits_block_anon_del on public.expense_splits;
drop policy if exists ra_expense_comments_block_anon_ins on public.expense_comments;
drop policy if exists ra_user_profiles_block_anon_ins on public.user_profiles;
drop policy if exists ra_user_profiles_block_anon_upd on public.user_profiles;
drop policy if exists ra_storage_objects_block_anon_ins on storage.objects;
drop policy if exists ra_storage_objects_block_anon_upd on storage.objects;
drop policy if exists ra_storage_objects_block_anon_del on storage.objects;

do $$
begin
  if to_regclass('public.expenses') is not null then
    drop policy if exists ra_expenses_block_anon_ins on public.expenses;
    drop policy if exists ra_expenses_block_anon_upd on public.expenses;
    drop policy if exists ra_expenses_block_anon_del on public.expenses;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5) PERMISSIVE 編集系から JWT 匿名条件を除去して再作成
-- ---------------------------------------------------------------------------
drop policy if exists "groups_insert_creator" on public.groups;
drop policy if exists "groups_update_owner" on public.groups;
drop policy if exists "groups_delete_owner" on public.groups;

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
)
with check (
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

drop policy if exists "group_members_insert_by_owner" on public.group_members;
drop policy if exists "group_members_delete_by_owner" on public.group_members;

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

drop policy if exists "group_expenses_insert" on public.group_expenses;
drop policy if exists "group_expenses_update" on public.group_expenses;
drop policy if exists "group_expenses_delete" on public.group_expenses;

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

drop policy if exists "expense_splits_insert" on public.expense_splits;
drop policy if exists "expense_splits_update" on public.expense_splits;
drop policy if exists "expense_splits_delete" on public.expense_splits;

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

drop policy if exists "expense_comments_insert_members" on public.expense_comments;

create policy "expense_comments_insert_members"
on public.expense_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.group_expenses ge
    where ge.id = expense_comments.expense_id
      and public.is_group_member(ge.group_id, (select auth.uid()))
  )
);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;

create policy "user_profiles_insert_own" on public.user_profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "user_profiles_update_own" on public.user_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$
begin
  if to_regclass('public.expenses') is null then
    return;
  end if;

  drop policy if exists "expenses_insert_members" on public.expenses;
  drop policy if exists "expenses_update_members" on public.expenses;
  drop policy if exists "expenses_delete_members" on public.expenses;

  create policy "expenses_insert_members"
  on public.expenses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );

  create policy "expenses_update_members"
  on public.expenses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );

  create policy "expenses_delete_members"
  on public.expenses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );
end
$$;

drop policy if exists receipts_insert_members on storage.objects;
drop policy if exists receipts_update_members on storage.objects;
drop policy if exists receipts_delete_members on storage.objects;

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

notify pgrst, 'reload schema';
