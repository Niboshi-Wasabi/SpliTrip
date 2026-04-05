-- Preferred UI language for i18n (middleware + next-intl cookie alignment).
-- i18n 用の UI 言語（ミドルウェアと next-intl クッキーと整合）。

alter table public.user_profiles
  add column if not exists preferred_language text not null default 'ja'
  check (preferred_language in ('ja', 'en'));

comment on column public.user_profiles.preferred_language is 'UI locale: ja | en';
