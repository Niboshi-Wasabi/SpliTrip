-- 送金リンク用: PayPal.me / Cash App の公開識別子（URL 全体は保存しない）

alter table public.user_profiles
  add column if not exists paypal_me_id text;

alter table public.user_profiles
  add column if not exists cash_app_cashtag text;

comment on column public.user_profiles.paypal_me_id is 'PayPal.me のユーザー名のみ（例: myname）。URL は含めない';
comment on column public.user_profiles.cash_app_cashtag is 'Cash App の Cashtag（先頭の $ は含めない）';
