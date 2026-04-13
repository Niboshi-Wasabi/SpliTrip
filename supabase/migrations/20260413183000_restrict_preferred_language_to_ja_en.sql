-- Restrict preferred_language to ja/en after i18n scope reduction.
-- 2言語運用（ja/en）のみ許可し、既存の他言語値は en に正規化する。

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select pg_constraint.conname
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'user_profiles'
      and pg_constraint.contype = 'c'
      and pg_get_constraintdef(pg_constraint.oid) ilike '%preferred_language%'
  loop
    execute format(
      'alter table public.user_profiles drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end
$$;

update public.user_profiles
set preferred_language = case
  when preferred_language = 'ja' then 'ja'
  else 'en'
end
where preferred_language is distinct from case
  when preferred_language = 'ja' then 'ja'
  else 'en'
end;

alter table public.user_profiles
  add constraint user_profiles_preferred_language_check
  check (preferred_language in ('ja', 'en'));

comment on column public.user_profiles.preferred_language is
  'UI locale: ja | en';
