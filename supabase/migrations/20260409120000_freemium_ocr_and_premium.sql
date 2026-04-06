-- Freemium: OCR usage counter, PRO flag, and RPC to increment OCR after successful Gemini parse.
-- フリーミアム: OCR 利用回数・PRO フラグ・成功後に OCR を加算する RPC。

alter table public.user_profiles
  add column if not exists ocr_usage_count integer not null default 0 check (ocr_usage_count >= 0),
  add column if not exists premium_access boolean not null default false;

comment on column public.user_profiles.ocr_usage_count is
  'Gemini レシート OCR の累計（無料枠はアプリ側で 3 回まで）。PRO は参照のみでブロックしない。';
comment on column public.user_profiles.premium_access is
  'true = SpliTrip PRO（無制限 OCR・エクスポート等）。決済連携前は手動または別途更新。';

-- After a successful OCR parse, bump count for non-PRO users only (upsert if row missing).
create or replace function public.increment_ocr_usage_if_not_premium()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.user_profiles (id, display_name, ocr_usage_count, premium_access)
  values (auth.uid(), 'ユーザー', 1, false)
  on conflict (id) do update set
    ocr_usage_count = case
      when coalesce(user_profiles.premium_access, false) then user_profiles.ocr_usage_count
      else user_profiles.ocr_usage_count + 1
    end;
end;
$$;

-- Extend profile JSON for client + server (settings, export gates, OCR remaining).
create or replace function public.get_own_profile()
returns json
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select row_to_json(r) from (
    select
      id,
      display_name,
      avatar_url,
      paypal_me_id,
      cash_app_cashtag,
      preferred_language,
      payment_links,
      pitch_deck_seen_at,
      premium_access,
      ocr_usage_count
    from public.user_profiles
    where id = auth.uid()
  ) r;
$$;

grant execute on function public.increment_ocr_usage_if_not_premium() to authenticated;

notify pgrst, 'reload schema';
