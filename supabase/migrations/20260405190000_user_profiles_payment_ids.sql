-- 送金リンク用: PayPal.me / Cash App の公開識別子（URL 全体は保存しない）
--
-- このファイルのタイムスタンプは 06140000_user_profiles_rls より前のため、空の DB では
-- user_profiles がまだ存在しない。先に最小スキーマを用意してから ALTER する。
--（06140000 側の create table if not exists と整合）

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ユーザー',
  avatar_url text,
  paypal_me_id text,
  cash_app_cashtag text,
  preferred_language text not null default 'ja'
    check (preferred_language in ('ja', 'en')),
  created_at timestamptz default now()
);

alter table public.user_profiles
  add column if not exists paypal_me_id text;

alter table public.user_profiles
  add column if not exists cash_app_cashtag text;

comment on column public.user_profiles.paypal_me_id is 'PayPal.me のユーザー名のみ（例: myname）。URL は含めない';
comment on column public.user_profiles.cash_app_cashtag is 'Cash App の Cashtag（先頭の $ は含めない）';
