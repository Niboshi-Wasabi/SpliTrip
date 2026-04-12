-- Security Advisor: "Function Search Path Mutable" on user_profiles_guard_premium_flags
-- セキュリティアドバイザー: search_path 未固定の指摘対策（search_path ハイジャック防止）。
--
-- Why SET search_path = public:
--   SECURITY DEFINER 相当のトリガー本体は auth.role() を参照するが、search_path が可変だと
--   悪意あるスキーマで同名オブジェクトを解決されうる。public に固定する。
--   Pinning search_path prevents resolving same-named objects in an attacker-controlled schema.

create or replace function public.user_profiles_guard_premium_flags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() is distinct from 'service_role' then
      new.premium_access := false;
      new.premium_access_source := 'none';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if
      new.premium_access is distinct from old.premium_access
      or new.premium_access_source is distinct from old.premium_access_source
    then
      if auth.role() = 'service_role' then
        return new;
      end if;
      if auth.uid() is null then
        return new;
      end if;
      if new.id = auth.uid() then
        new.premium_access := old.premium_access;
        new.premium_access_source := old.premium_access_source;
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

comment on function public.user_profiles_guard_premium_flags() is
  'Blocks self-service premium flag changes; search_path pinned for Security Advisor. / PRO 自己書き換え防止、search_path 固定。';

notify pgrst, 'reload schema';
