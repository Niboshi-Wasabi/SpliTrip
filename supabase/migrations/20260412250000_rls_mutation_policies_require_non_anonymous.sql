-- 匿名 JWT（is_anonymous=true, ロール authenticated）の INSERT/UPDATE/DELETE を
-- PERMISSIVE に明示条件 + RESTRICTIVE で二重化して拒否する。
-- 判定式（全編集系で共通）:
--   ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
-- SELECT ポリシーは変更しない。
--
-- 前提: 20260412230000 の ra_* RESTRICTIVE と auth_jwt_is_anonymous() は本マイグレで置換する。

-- ---------------------------------------------------------------------------
-- 共通: 既存 RESTRICTIVE（匿名ブロック）を削除（後段でインライン式で再作成）
-- ---------------------------------------------------------------------------
drop policy if exists ra_groups_block_anon_ins on public.groups;
drop policy if exists ra_groups_block_anon_upd on public.groups;
drop policy if exists ra_groups_block_anon_del on public.groups;
drop policy if exists ra_group_members_block_anon_ins on public.group_members;
drop policy if exists ra_group_members_block_anon_del on public.group_members;
drop policy if exists ra_group_expenses_block_anon_ins on public.group_expenses;
drop policy if exists ra_group_expenses_block_anon_upd on public.group_expenses;
drop policy if exists ra_group_expenses_block_anon_del on public.group_expenses;
drop policy if exists ra_expense_splits_block_anon_ins on public.expense_splits;
drop policy if exists ra_expense_splits_block_anon_upd on public.expense_splits;
drop policy if exists ra_expense_splits_block_anon_del on public.expense_splits;
drop policy if exists ra_expense_comments_block_anon_ins on public.expense_comments;
drop policy if exists ra_user_profiles_block_anon_ins on public.user_profiles;
drop policy if exists ra_user_profiles_block_anon_upd on public.user_profiles;
drop policy if exists ra_storage_objects_block_anon_ins on storage.objects;
drop policy if exists ra_storage_objects_block_anon_upd on storage.objects;
drop policy if exists ra_storage_objects_block_anon_del on storage.objects;

do $$
begin
  if to_regclass('public.expenses') is not null then
    drop policy if exists ra_expenses_block_anon_ins on public.expenses;
    drop policy if exists ra_expenses_block_anon_upd on public.expenses;
    drop policy if exists ra_expenses_block_anon_del on public.expenses;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- PERMISSIVE 編集系を削除して、非匿名条件付きで再作成
-- ---------------------------------------------------------------------------
drop policy if exists "groups_insert_creator" on public.groups;
drop policy if exists "groups_update_owner" on public.groups;
drop policy if exists "groups_delete_owner" on public.groups;

create policy "groups_insert_creator"
on public.groups
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and created_by = (select auth.uid())
);

create policy "groups_update_owner"
on public.groups
for update
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
)
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

create policy "groups_delete_owner"
on public.groups
for delete
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

drop policy if exists "group_members_insert_by_owner" on public.group_members;
drop policy if exists "group_members_delete_by_owner" on public.group_members;

create policy "group_members_insert_by_owner"
on public.group_members
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

create policy "group_members_delete_by_owner"
on public.group_members
for delete
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  )
);

drop policy if exists "group_expenses_insert" on public.group_expenses;
drop policy if exists "group_expenses_update" on public.group_expenses;
drop policy if exists "group_expenses_delete" on public.group_expenses;

create policy "group_expenses_insert"
on public.group_expenses
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and public.is_group_member(group_id, (select auth.uid()))
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_expenses.group_id
      and gm.user_id = payer_id
  )
);

create policy "group_expenses_update"
on public.group_expenses
for update
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and public.is_group_member(group_id, (select auth.uid()))
)
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and public.is_group_member(group_id, (select auth.uid()))
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_expenses.group_id
      and gm.user_id = payer_id
  )
);

create policy "group_expenses_delete"
on public.group_expenses
for delete
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and public.is_group_member(group_id, (select auth.uid()))
);

drop policy if exists "expense_splits_insert" on public.expense_splits;
drop policy if exists "expense_splits_update" on public.expense_splits;
drop policy if exists "expense_splits_delete" on public.expense_splits;

create policy "expense_splits_insert"
on public.expense_splits
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
  and exists (
    select 1
    from public.group_members gm
    join public.group_expenses e on e.group_id = gm.group_id
    where e.id = expense_splits.expense_id
      and gm.user_id = expense_splits.user_id
  )
);

create policy "expense_splits_update"
on public.expense_splits
for update
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
)
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
);

create policy "expense_splits_delete"
on public.expense_splits
for delete
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and exists (
    select 1
    from public.group_expenses e
    where e.id = expense_splits.expense_id
      and public.is_group_member(e.group_id, (select auth.uid()))
  )
);

drop policy if exists "expense_comments_insert_members" on public.expense_comments;

create policy "expense_comments_insert_members"
on public.expense_comments
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and author_id = (select auth.uid())
  and exists (
    select 1
    from public.group_expenses ge
    where ge.id = expense_comments.expense_id
      and public.is_group_member(ge.group_id, (select auth.uid()))
  )
);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;

create policy "user_profiles_insert_own" on public.user_profiles
  for insert to authenticated
  with check (
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and id = (select auth.uid())
  );

create policy "user_profiles_update_own" on public.user_profiles
  for update to authenticated
  using (
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and id = (select auth.uid())
  )
  with check (
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and id = (select auth.uid())
  );

do $$
begin
  if to_regclass('public.expenses') is null then
    return;
  end if;

  drop policy if exists "expenses_insert_members" on public.expenses;
  drop policy if exists "expenses_update_members" on public.expenses;
  drop policy if exists "expenses_delete_members" on public.expenses;

  create policy "expenses_insert_members"
  on public.expenses
  for insert
  to authenticated
  with check (
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and exists (
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
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  )
  with check (
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and exists (
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
    ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = expenses.group_id
        and gm.user_id = (select auth.uid())
    )
  );
end
$$;

drop policy if exists receipts_insert_members on storage.objects;
drop policy if exists receipts_update_members on storage.objects;
drop policy if exists receipts_delete_members on storage.objects;

create policy receipts_insert_members
on storage.objects
for insert
to authenticated
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

create policy receipts_update_members
on storage.objects
for update
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
)
with check (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

create policy receipts_delete_members
on storage.objects
for delete
to authenticated
using (
  ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  and bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select gm.group_id::text
    from public.group_members gm
    where gm.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- RESTRICTIVE: 上記と同じ式で二重化（PERMISSIVE の OR 抜け対策）
-- ---------------------------------------------------------------------------
create policy ra_groups_block_anon_ins on public.groups
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_groups_block_anon_upd on public.groups
  as restrictive for update to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false)
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_groups_block_anon_del on public.groups
  as restrictive for delete to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_group_members_block_anon_ins on public.group_members
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_group_members_block_anon_del on public.group_members
  as restrictive for delete to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_group_expenses_block_anon_ins on public.group_expenses
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_group_expenses_block_anon_upd on public.group_expenses
  as restrictive for update to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false)
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_group_expenses_block_anon_del on public.group_expenses
  as restrictive for delete to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_expense_splits_block_anon_ins on public.expense_splits
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_expense_splits_block_anon_upd on public.expense_splits
  as restrictive for update to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false)
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_expense_splits_block_anon_del on public.expense_splits
  as restrictive for delete to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_expense_comments_block_anon_ins on public.expense_comments
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_user_profiles_block_anon_ins on public.user_profiles
  as restrictive for insert to authenticated
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_user_profiles_block_anon_upd on public.user_profiles
  as restrictive for update to authenticated
  using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false)
  with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

create policy ra_storage_objects_block_anon_ins on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id is distinct from 'receipts'
    or ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  );

create policy ra_storage_objects_block_anon_upd on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id is distinct from 'receipts'
    or ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  )
  with check (
    bucket_id is distinct from 'receipts'
    or ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  );

create policy ra_storage_objects_block_anon_del on storage.objects
  as restrictive for delete to authenticated
  using (
    bucket_id is distinct from 'receipts'
    or ((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false
  );

do $$
begin
  if to_regclass('public.expenses') is null then
    return;
  end if;

  create policy ra_expenses_block_anon_ins on public.expenses
    as restrictive for insert to authenticated
    with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

  create policy ra_expenses_block_anon_upd on public.expenses
    as restrictive for update to authenticated
    using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false)
    with check (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);

  create policy ra_expenses_block_anon_del on public.expenses
    as restrictive for delete to authenticated
    using (((coalesce(auth.jwt() ->> 'is_anonymous', 'false'))::boolean) is false);
end
$$;

notify pgrst, 'reload schema';
