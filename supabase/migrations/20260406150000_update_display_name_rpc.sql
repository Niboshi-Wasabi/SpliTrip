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
