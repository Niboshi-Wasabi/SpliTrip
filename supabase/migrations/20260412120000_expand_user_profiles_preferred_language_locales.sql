-- Expand preferred_language to all supported app locales.
-- 14言語ロケール（ja/en/zh-CN/.../hi）を許可する。

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

alter table public.user_profiles
  add constraint user_profiles_preferred_language_check
  check (
    preferred_language in (
      'ja',
      'en',
      'zh-CN',
      'zh-TW',
      'ko',
      'es',
      'fr',
      'de',
      'pt',
      'ru',
      'tr',
      'ar',
      'sw',
      'hi'
    )
  );

comment on column public.user_profiles.preferred_language is
  'UI locale: ja | en | zh-CN | zh-TW | ko | es | fr | de | pt | ru | tr | ar | sw | hi';
