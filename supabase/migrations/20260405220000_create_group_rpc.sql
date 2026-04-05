-- Server actions / PostgREST で RLS が JWT とずれて groups INSERT が弾かれる場合の回避策。
-- SECURITY DEFINER で挿入しつつ、呼び出しユーザーの auth.uid() のみを created_by に使う。

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

comment on function public.create_group_with_invite(text, text) is
  'Creates a group as the current user; bypasses RLS while binding created_by to auth.uid().';

revoke all on function public.create_group_with_invite(text, text) from public;
grant execute on function public.create_group_with_invite(text, text) to authenticated;
