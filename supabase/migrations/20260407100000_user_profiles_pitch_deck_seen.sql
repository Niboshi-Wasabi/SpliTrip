-- First-login product deck: persist completion on user_profiles.
-- 初回ログイン時の機能紹介スライド完了を user_profiles に保存する。

alter table public.user_profiles
  add column if not exists pitch_deck_seen_at timestamptz null;

comment on column public.user_profiles.pitch_deck_seen_at is
  'Set when the user finishes the in-app pitch deck; null means not shown yet.';

-- Existing accounts: treat as already introduced (avoid forcing the deck on all legacy users).
-- 既存ユーザーはデプロイ時点で「既に案内済み」とみなす。
update public.user_profiles
set pitch_deck_seen_at = coalesce(pitch_deck_seen_at, now())
where pitch_deck_seen_at is null;

-- True when the signed-in user must see the pitch deck (new row after migration, or seen_at still null).
create or replace function public.needs_pitch_deck()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select pitch_deck_seen_at is null from public.user_profiles where id = auth.uid()),
    true
  );
$$;

-- Idempotent: sets pitch_deck_seen_at = now() for the current user.
create or replace function public.mark_pitch_deck_seen()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, pitch_deck_seen_at)
  values (auth.uid(), 'ユーザー', now())
  on conflict (id) do update set pitch_deck_seen_at = now();
end;
$$;

notify pgrst, 'reload schema';
