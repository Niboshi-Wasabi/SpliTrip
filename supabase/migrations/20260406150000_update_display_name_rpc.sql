-- RPC to update display_name on user_profiles, bypassing RLS.
-- user_profiles の display_name を更新する RPC（RLS バイパス）。

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

-- RPC to read own display_name (for checking if a custom name is already set).
-- 自分の display_name を読み取る RPC。

create or replace function public.get_own_display_name()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select display_name from public.user_profiles where id = auth.uid();
$$;

-- RPC to upsert user profile with display_name and avatar_url (for OAuth logins).
-- OAuth ログイン時に display_name と avatar_url をまとめて upsert する RPC。

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

-- RPC to fetch profiles of all members in a group (bypasses RLS).
-- グループメンバー全員のプロフィールを取得する RPC（RLS バイパス）。

create or replace function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  display_name text,
  paypal_me_id text,
  cash_app_cashtag text
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
    up.paypal_me_id,
    up.cash_app_cashtag
  from public.group_members gm
  join public.user_profiles up on up.id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id, auth.uid());
$$;

-- RPC to read own full profile (for settings page).
create or replace function public.get_own_profile()
returns json
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select row_to_json(r) from (
    select id, display_name, avatar_url, paypal_me_id, cash_app_cashtag, preferred_language
    from public.user_profiles
    where id = auth.uid()
  ) r;
$$;

-- RPC to update payment methods.
create or replace function public.update_own_payment_methods(
  p_paypal_me_id text,
  p_cash_app_cashtag text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, paypal_me_id, cash_app_cashtag)
  values (auth.uid(), 'ユーザー', p_paypal_me_id, p_cash_app_cashtag)
  on conflict (id)
  do update set
    paypal_me_id = excluded.paypal_me_id,
    cash_app_cashtag = excluded.cash_app_cashtag;
end;
$$;

-- RPC to update preferred language (upsert).
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

-- RPC to get own preferred language (for middleware).
create or replace function public.get_own_preferred_language()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select preferred_language from public.user_profiles where id = auth.uid();
$$;
