-- Security Advisor lint 0008: RLS enabled but no policies.
-- trips / trip_members はレガシー表のため存在時のみポリシー追加。
-- user_profiles は本番でポリシー欠落している場合の冪等な再作成。

-- ---------------------------------------------------------------------------
-- public.trips: メンバーのみ SELECT
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.trips') is null then
    return;
  end if;

  alter table public.trips enable row level security;

  begin
    create policy "trips_select_for_members"
    on public.trips
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.trip_members tm
        where tm.trip_id = trips.id
          and tm.user_id = (select auth.uid())
      )
    );
  exception
    when duplicate_object then null;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- public.trip_members: 同一 trip のメンバー同士で SELECT（ダッシュボードのメンバー一覧）
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.trip_members') is null then
    return;
  end if;

  alter table public.trip_members enable row level security;

  begin
    create policy "trip_members_select_for_members"
    on public.trip_members
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.trip_members tm2
        where tm2.trip_id = trip_members.trip_id
          and tm2.user_id = (select auth.uid())
      )
    );
  exception
    when duplicate_object then null;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- public.user_profiles: 06140000 と同内容（欠落時の修復）
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.user_profiles') is null then
    return;
  end if;

  alter table public.user_profiles enable row level security;

  begin
    create policy "user_profiles_select_own" on public.user_profiles
      for select to authenticated
      using (id = (select auth.uid()));
  exception
    when duplicate_object then null;
  end;

  begin
    create policy "user_profiles_insert_own" on public.user_profiles
      for insert to authenticated
      with check (id = (select auth.uid()));
  exception
    when duplicate_object then null;
  end;

  begin
    create policy "user_profiles_update_own" on public.user_profiles
      for update to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  exception
    when duplicate_object then null;
  end;

  begin
    create policy "user_profiles_select_group_members" on public.user_profiles
      for select to authenticated
      using (
        exists (
          select 1 from public.group_members gm1
          join public.group_members gm2 on gm1.group_id = gm2.group_id
          where gm1.user_id = (select auth.uid())
            and gm2.user_id = user_profiles.id
        )
      );
  exception
    when duplicate_object then null;
  end;
end
$$;

notify pgrst, 'reload schema';
