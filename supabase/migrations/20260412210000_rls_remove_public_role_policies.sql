-- Fix Security Advisor: RLS policies targeting role PUBLIC (includes anon).
-- セキュリティアドバイザー: `TO public` は anon も含むため、`authenticated` に限定する。
--
-- Context from pg_policies / 実データの整理:
-- - groups: "Members can view groups" duplicated groups_select_for_members (authenticated).
-- - expenses: "Members can manage expenses" was ALL + {public}; replace with authenticated-only split.

-- ---------------------------------------------------------------------------
-- groups: drop redundant {public} SELECT policy / 重複する public 向け SELECT を削除
-- ---------------------------------------------------------------------------
drop policy if exists "Members can view groups" on public.groups;

-- ---------------------------------------------------------------------------
-- expenses: replace {public} ALL with authenticated CRUD / legacy テーブルを authenticated のみに
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.expenses') is null then
    return;
  end if;

  drop policy if exists "Members can manage expenses" on public.expenses;

  create policy "expenses_select_members"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );

  create policy "expenses_insert_members"
  on public.expenses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );

  create policy "expenses_update_members"
  on public.expenses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );

  create policy "expenses_delete_members"
  on public.expenses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );
end
$$;

notify pgrst, 'reload schema';
