-- Enforce 50-character display_name at RPC boundary (aligns with app DISPLAY_NAME_MAX_LENGTH).

create or replace function public.update_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v text := left(trim(p_display_name), 50);
begin
  if v = '' then
    raise exception 'display_name_required';
  end if;
  insert into public.user_profiles (id, display_name)
  values (auth.uid(), v)
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
declare
  v text := left(trim(p_display_name), 50);
begin
  if v = '' then
    v := 'ユーザー';
  end if;
  insert into public.user_profiles (id, display_name, avatar_url)
  values (auth.uid(), v, p_avatar_url)
  on conflict (id)
  do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;
end;
$$;
