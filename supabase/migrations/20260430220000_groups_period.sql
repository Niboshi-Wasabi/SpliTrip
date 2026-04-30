-- Add optional travel period to groups.
-- グループに任意の期間（開始日/終了日）を持たせる。

alter table public.groups
  add column if not exists period_start_date date,
  add column if not exists period_end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'groups_period_range_check'
      and n.nspname = 'public'
      and t.relname = 'groups'
  ) then
    alter table public.groups
      add constraint groups_period_range_check
      check (
        (period_start_date is null and period_end_date is null)
        or (period_start_date is not null and period_end_date is not null and period_start_date <= period_end_date)
      );
  end if;
end
$$;

comment on column public.groups.period_start_date is 'Group travel period start date (optional).';
comment on column public.groups.period_end_date is 'Group travel period end date (optional).';

notify pgrst, 'reload schema';
