-- get_group_member_profiles に avatar_url を追加する。
-- Add avatar_url to get_group_member_profiles RPC return type.
--
-- Return type (OUT columns) が変わるため create or replace だけでは更新できない。
-- 先行マイグレーション 06150000 の定義を drop してから作り直す。

drop function if exists public.get_group_member_profiles(uuid);

create or replace function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
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
    up.avatar_url,
    up.paypal_me_id,
    up.cash_app_cashtag
  from public.group_members gm
  join public.user_profiles up on up.id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id, auth.uid());
$$;

NOTIFY pgrst, 'reload schema';
