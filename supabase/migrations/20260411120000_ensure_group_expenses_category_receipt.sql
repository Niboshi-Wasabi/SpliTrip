-- 本番などで `20260406230000_expense_categories_receipts_audit_storage.sql` が未適用のまま
-- `20260408120000_world_class_extensions.sql` だけ適用された場合、insert_expense_with_splits が
-- group_expenses.category を参照して失敗する。列を idempotent に追加する。
-- 内容は 062300 の該当 DDL と同一。適用済み環境では no-op に近い。

alter table public.group_expenses
  add column if not exists category text not null default 'other';

do $$ begin
  alter table public.group_expenses
    add constraint group_expenses_category_check
    check (category in ('food', 'transport', 'lodging', 'sightseeing', 'other'));
exception
  when duplicate_object then null;
end $$;

alter table public.group_expenses
  add column if not exists receipt_url text;

comment on column public.group_expenses.category is
  'Expense category: food | transport | lodging | sightseeing | other';
comment on column public.group_expenses.receipt_url is
  'Storage path under bucket receipts (not a public URL).';

notify pgrst, 'reload schema';
