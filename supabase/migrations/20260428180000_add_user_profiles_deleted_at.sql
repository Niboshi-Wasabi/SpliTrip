alter table public.user_profiles
  add column if not exists deleted_at timestamptz;

comment on column public.user_profiles.deleted_at is
  '管理者により利用停止（削除扱い）にした時刻。null 以外はアプリ画面を account-deleted へ誘導する。';
