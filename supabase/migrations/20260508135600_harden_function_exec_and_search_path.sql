-- Security hardening:
-- 1) Pin search_path for mutable-function linter warnings.
-- 2) Revoke execute on internal/admin SECURITY DEFINER functions from API roles.

do $$
begin
  if to_regprocedure('public.maintenance_schedules_set_updated_at()') is not null then
    alter function public.maintenance_schedules_set_updated_at()
      set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.system_status_touch_updated_at()') is not null then
    alter function public.system_status_touch_updated_at()
      set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.app_announcements_set_updated_at()') is not null then
    alter function public.app_announcements_set_updated_at()
      set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.is_current_user_admin()') is not null then
    alter function public.is_current_user_admin()
      set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.make_user_admin(text)') is not null then
    alter function public.make_user_admin(text)
      set search_path = public, pg_temp;
  end if;
end
$$;

do $$
begin
  -- Internal/admin-only functions should never be callable from Data API roles.
  if to_regprocedure('public.make_user_admin(text)') is not null then
    revoke execute on function public.make_user_admin(text) from public, anon, authenticated;
  end if;

  if to_regprocedure('public.is_current_user_admin()') is not null then
    revoke execute on function public.is_current_user_admin() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.tr_audit_group_expenses()') is not null then
    revoke execute on function public.tr_audit_group_expenses() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.tr_groups_add_owner_member()') is not null then
    revoke execute on function public.tr_groups_add_owner_member() from public, anon, authenticated;
  end if;
end
$$;

notify pgrst, 'reload schema';
