-- 方針B: signInAnonymously（JWT is_anonymous=true）は閲覧のみ。INSERT/UPDATE/DELETE は永続ユーザーのみ。
-- 実装: (1) RESTRICTIVE ポリシーで匿名を拒否 (2) SECURITY DEFINER の変異RPCは先頭で匿名を拒否
-- 招待参加の匿名経路はアプリ側 POST /api/join/by-invite（サービスロール）に移行。

-- ---------------------------------------------------------------------------
-- JWT 匿名セッション判定（RLS / PLpgSQL 共通）
-- ---------------------------------------------------------------------------
create or replace function public.auth_jwt_is_anonymous()
returns boolean
language sql
stable
parallel safe
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous') = 'true', false);
$$;

comment on function public.auth_jwt_is_anonymous() is
  'True when current JWT is Supabase anonymous sign-in (is_anonymous claim). Used by RLS restrictive policies.';

grant execute on function public.auth_jwt_is_anonymous() to authenticated;
grant execute on function public.auth_jwt_is_anonymous() to anon;

-- ---------------------------------------------------------------------------
-- RESTRICTIVE: 匿名の INSERT/UPDATE/DELETE を一律拒否（SELECT は既存 PERMISSIVE のみ）
-- ---------------------------------------------------------------------------
drop policy if exists ra_groups_block_anon_ins on public.groups;
create policy ra_groups_block_anon_ins on public.groups
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_groups_block_anon_upd on public.groups;
create policy ra_groups_block_anon_upd on public.groups
  as restrictive for update to authenticated
  using (not public.auth_jwt_is_anonymous())
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_groups_block_anon_del on public.groups;
create policy ra_groups_block_anon_del on public.groups
  as restrictive for delete to authenticated
  using (not public.auth_jwt_is_anonymous());

drop policy if exists ra_group_members_block_anon_ins on public.group_members;
create policy ra_group_members_block_anon_ins on public.group_members
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_group_members_block_anon_del on public.group_members;
create policy ra_group_members_block_anon_del on public.group_members
  as restrictive for delete to authenticated
  using (not public.auth_jwt_is_anonymous());

drop policy if exists ra_group_expenses_block_anon_ins on public.group_expenses;
create policy ra_group_expenses_block_anon_ins on public.group_expenses
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_group_expenses_block_anon_upd on public.group_expenses;
create policy ra_group_expenses_block_anon_upd on public.group_expenses
  as restrictive for update to authenticated
  using (not public.auth_jwt_is_anonymous())
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_group_expenses_block_anon_del on public.group_expenses;
create policy ra_group_expenses_block_anon_del on public.group_expenses
  as restrictive for delete to authenticated
  using (not public.auth_jwt_is_anonymous());

drop policy if exists ra_expense_splits_block_anon_ins on public.expense_splits;
create policy ra_expense_splits_block_anon_ins on public.expense_splits
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_expense_splits_block_anon_upd on public.expense_splits;
create policy ra_expense_splits_block_anon_upd on public.expense_splits
  as restrictive for update to authenticated
  using (not public.auth_jwt_is_anonymous())
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_expense_splits_block_anon_del on public.expense_splits;
create policy ra_expense_splits_block_anon_del on public.expense_splits
  as restrictive for delete to authenticated
  using (not public.auth_jwt_is_anonymous());

drop policy if exists ra_expense_comments_block_anon_ins on public.expense_comments;
create policy ra_expense_comments_block_anon_ins on public.expense_comments
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_user_profiles_block_anon_ins on public.user_profiles;
create policy ra_user_profiles_block_anon_ins on public.user_profiles
  as restrictive for insert to authenticated
  with check (not public.auth_jwt_is_anonymous());

drop policy if exists ra_user_profiles_block_anon_upd on public.user_profiles;
create policy ra_user_profiles_block_anon_upd on public.user_profiles
  as restrictive for update to authenticated
  using (not public.auth_jwt_is_anonymous())
  with check (not public.auth_jwt_is_anonymous());

-- legacy expenses（存在時のみ restrictive を追加）
do $$
begin
  if to_regclass('public.expenses') is null then
    return;
  end if;

  drop policy if exists ra_expenses_block_anon_ins on public.expenses;
  create policy ra_expenses_block_anon_ins on public.expenses
    as restrictive for insert to authenticated
    with check (not public.auth_jwt_is_anonymous());

  drop policy if exists ra_expenses_block_anon_upd on public.expenses;
  create policy ra_expenses_block_anon_upd on public.expenses
    as restrictive for update to authenticated
    using (not public.auth_jwt_is_anonymous())
    with check (not public.auth_jwt_is_anonymous());

  drop policy if exists ra_expenses_block_anon_del on public.expenses;
  create policy ra_expenses_block_anon_del on public.expenses
    as restrictive for delete to authenticated
    using (not public.auth_jwt_is_anonymous());
end
$$;

-- Storage receipts: 匿名のアップロード/変更/削除を拒否（receipts 以外は条件でスルー）
drop policy if exists ra_storage_objects_block_anon_ins on storage.objects;
create policy ra_storage_objects_block_anon_ins on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id is distinct from 'receipts'
    or not public.auth_jwt_is_anonymous()
  );

drop policy if exists ra_storage_objects_block_anon_upd on storage.objects;
create policy ra_storage_objects_block_anon_upd on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id is distinct from 'receipts'
    or not public.auth_jwt_is_anonymous()
  )
  with check (
    bucket_id is distinct from 'receipts'
    or not public.auth_jwt_is_anonymous()
  );

drop policy if exists ra_storage_objects_block_anon_del on storage.objects;
create policy ra_storage_objects_block_anon_del on storage.objects
  as restrictive for delete to authenticated
  using (
    bucket_id is distinct from 'receipts'
    or not public.auth_jwt_is_anonymous()
  );

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPC: RLS をバイパスする変異は匿名を拒否（招待参加は HTTP 経路）
-- ---------------------------------------------------------------------------
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

  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden'
      using hint = 'Use POST /api/join/by-invite with a browser session cookie.';
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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
    -- ALTER FUNCTION … SET は括弧形ではない（42601 になる）。SET row_security TO off が正しい。
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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

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
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

  insert into public.user_profiles (id, display_name, pitch_deck_seen_at)
  values (auth.uid(), 'ユーザー', now())
  on conflict (id) do update set pitch_deck_seen_at = now();
end;
$$;

create or replace function public.set_own_member_guest_flag(
  p_group_id uuid,
  p_is_guest boolean
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if public.auth_jwt_is_anonymous() then
    raise exception 'anonymous_mutation_forbidden';
  end if;

  update public.group_members
  set is_guest = p_is_guest
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

notify pgrst, 'reload schema';
