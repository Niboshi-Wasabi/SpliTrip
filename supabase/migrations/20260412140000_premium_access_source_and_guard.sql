-- PRO 付与の出所（課金 / 手動）と、認証ユーザーによる premium 自己書き換え防止。
-- Stripe は service_role、手動付与は SQL Editor（postgres）で更新する想定。

alter table public.user_profiles
  add column if not exists premium_access_source text not null default 'none'
    check (premium_access_source in ('none', 'stripe', 'manual'));

comment on column public.user_profiles.premium_access_source is
  'PRO の根拠: none=未付与, stripe=Checkout/Webhook, manual=運営が SQL 等で付与。';

-- 既存行: PRO 済みは課金経由とみなして stripe（手動のみの行は運営で manual に直せる）
update public.user_profiles
set premium_access_source = 'stripe'
where premium_access = true
  and premium_access_source = 'none';

-- 認証ユーザーが自分の premium_* だけを変えられないようにする（RLS では列単位制約がないため）
create or replace function public.user_profiles_guard_premium_flags()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() is distinct from 'service_role' then
      new.premium_access := false;
      new.premium_access_source := 'none';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if
      new.premium_access is distinct from old.premium_access
      or new.premium_access_source is distinct from old.premium_access_source
    then
      if auth.role() = 'service_role' then
        return new;
      end if;
      if auth.uid() is null then
        return new;
      end if;
      if new.id = auth.uid() then
        new.premium_access := old.premium_access;
        new.premium_access_source := old.premium_access_source;
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists user_profiles_guard_premium_flags_trigger on public.user_profiles;

create trigger user_profiles_guard_premium_flags_trigger
  before insert or update on public.user_profiles
  for each row
  execute procedure public.user_profiles_guard_premium_flags();

-- get_own_profile の JSON に付与根拠を含める（ダッシュボード等で参照可能）
create or replace function public.get_own_profile()
returns json
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select row_to_json(profile_row) from (
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
      premium_access_source,
      ocr_usage_count
    from public.user_profiles
    where id = auth.uid()
  ) profile_row;
$$;

notify pgrst, 'reload schema';
