-- Persist optional per-line labels for itemized split mode.
-- 品目ごとの割り勘で、行名（品目名）を保持できるようにする。

alter table public.group_expenses
  add column if not exists itemized_lines jsonb;

comment on column public.group_expenses.itemized_lines is
  'Optional itemized split lines with labels. Shape: [{ name, amount, participant_ids[] }]';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'group_expenses_itemized_lines_array_check'
      and n.nspname = 'public'
      and t.relname = 'group_expenses'
  ) then
    alter table public.group_expenses
      add constraint group_expenses_itemized_lines_array_check
      check (
        itemized_lines is null
        or jsonb_typeof(itemized_lines) = 'array'
      );
  end if;
end
$$;

create or replace function public.tr_audit_group_expenses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_expense_id uuid;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_group_id := new.group_id;
    v_expense_id := new.id;
    v_payload := jsonb_build_object(
      'row', jsonb_build_object(
        'amount', new.amount,
        'description', new.description,
        'expense_date', new.expense_date,
        'category', new.category,
        'payer_id', new.payer_id,
        'receipt_url', new.receipt_url,
        'itemized_lines', new.itemized_lines
      )
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_group_id := new.group_id;
    v_expense_id := new.id;
    v_payload := jsonb_build_object(
      'before', jsonb_build_object(
        'amount', old.amount,
        'description', old.description,
        'expense_date', old.expense_date,
        'category', old.category,
        'payer_id', old.payer_id,
        'receipt_url', old.receipt_url,
        'itemized_lines', old.itemized_lines
      ),
      'after', jsonb_build_object(
        'amount', new.amount,
        'description', new.description,
        'expense_date', new.expense_date,
        'category', new.category,
        'payer_id', new.payer_id,
        'receipt_url', new.receipt_url,
        'itemized_lines', new.itemized_lines
      )
    );
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_group_id := old.group_id;
    v_expense_id := old.id;
    v_payload := jsonb_build_object(
      'row', jsonb_build_object(
        'amount', old.amount,
        'description', old.description,
        'expense_date', old.expense_date,
        'category', old.category,
        'payer_id', old.payer_id,
        'receipt_url', old.receipt_url,
        'itemized_lines', old.itemized_lines
      )
    );
  else
    return null;
  end if;

  insert into public.audit_logs (group_id, expense_id, actor_id, action, payload)
  values (v_group_id, v_expense_id, auth.uid(), v_action, v_payload);

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';
