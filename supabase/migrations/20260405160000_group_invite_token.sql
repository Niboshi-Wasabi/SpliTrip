-- 招待リンク: groups.invite_token と参加用 RPC（RLS を迂回して本人のみ group_members に追加）

alter table public.groups
  add column if not exists invite_token uuid not null unique default gen_random_uuid();

comment on column public.groups.invite_token is '招待URL用のユニークトークン（推測困難なUUID）';

-- トークンが有効なグループに、呼び出しユーザーを member として追加（既存メンバーは変更なし）
create or replace function public.join_group_by_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
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

revoke all on function public.join_group_by_invite(uuid) from public;
grant execute on function public.join_group_by_invite(uuid) to authenticated;
