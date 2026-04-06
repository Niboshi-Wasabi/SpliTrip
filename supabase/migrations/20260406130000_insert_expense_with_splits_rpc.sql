-- RPC: insert a group_expense row together with its expense_splits in one call.
-- Runs as SECURITY DEFINER with row_security = off to bypass RLS on
-- group_expenses / expense_splits INSERT policies (which have complex
-- cross-table subqueries that can fail under certain RLS evaluation contexts).

create or replace function public.insert_expense_with_splits(
  p_group_id   uuid,
  p_payer_id   uuid,
  p_amount     numeric,
  p_description text,
  p_expense_date date,
  p_splits     jsonb  -- array of { user_id, amount, ratio }
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  _expense_id uuid;
  _is_member  boolean;
begin
  -- Verify caller is a group member
  select public.is_group_member(p_group_id, auth.uid()) into _is_member;
  if not _is_member then
    raise exception 'forbidden: caller is not a member of this group';
  end if;

  -- Verify payer is a group member
  if not public.is_group_member(p_group_id, p_payer_id) then
    raise exception 'invalid_payer: payer is not a member of this group';
  end if;

  -- Insert the expense
  insert into public.group_expenses (group_id, payer_id, amount, description, expense_date)
  values (p_group_id, p_payer_id, p_amount, p_description, p_expense_date)
  returning id into _expense_id;

  -- Insert splits
  insert into public.expense_splits (expense_id, user_id, amount, ratio)
  select
    _expense_id,
    (s->>'user_id')::uuid,
    (s->>'amount')::numeric,
    (s->>'ratio')::numeric
  from jsonb_array_elements(p_splits) as s;

  return _expense_id;
end;
$$;

alter function public.insert_expense_with_splits(uuid, uuid, numeric, text, date, jsonb)
  set row_security = off;
