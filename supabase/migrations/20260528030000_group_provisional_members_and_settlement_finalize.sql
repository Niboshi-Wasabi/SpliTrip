-- Provisional members (no auth account) + settlement finalize state for share links.
-- 仮メンバー（未招待）でも精算対象に含められるようにし、精算完了状態を管理する。

alter table public.group_members
  add column if not exists is_provisional boolean not null default false,
  add column if not exists provisional_display_name text;

alter table public.group_members
  drop constraint if exists group_members_provisional_name_required;

alter table public.group_members
  add constraint group_members_provisional_name_required
  check (
    (is_provisional = false)
    or (coalesce(nullif(trim(provisional_display_name), ''), '') <> '')
  );

alter table public.groups
  add column if not exists settlement_finalized_at timestamptz;

alter table public.groups
  alter column public_share_token set default gen_random_uuid();

update public.groups
set public_share_token = gen_random_uuid()
where public_share_token is null;

do $$
declare
  foreign_key_record record;
begin
  for foreign_key_record in
    select table_name, constraint_name
    from information_schema.key_column_usage
    where table_schema = 'public'
      and (
        (table_name = 'group_members' and column_name = 'user_id')
        or (table_name = 'group_expenses' and column_name = 'payer_id')
        or (table_name = 'expense_splits' and column_name = 'user_id')
      )
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      foreign_key_record.table_name,
      foreign_key_record.constraint_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
