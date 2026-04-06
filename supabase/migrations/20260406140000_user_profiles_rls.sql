-- Ensure user_profiles table exists with RLS and self-access policies.
-- user_profiles テーブルの存在・RLS・自己アクセスポリシーを保証する。

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

alter table public.user_profiles enable row level security;

-- Authenticated users can read their own profile
do $$ begin
  create policy "user_profiles_select_own" on public.user_profiles
    for select to authenticated
    using (id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Authenticated users can insert their own profile
do $$ begin
  create policy "user_profiles_insert_own" on public.user_profiles
    for insert to authenticated
    with check (id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Authenticated users can update their own profile
do $$ begin
  create policy "user_profiles_update_own" on public.user_profiles
    for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Group members can read each other's profiles (for member lists)
do $$ begin
  create policy "user_profiles_select_group_members" on public.user_profiles
    for select to authenticated
    using (
      exists (
        select 1 from public.group_members gm1
        join public.group_members gm2 on gm1.group_id = gm2.group_id
        where gm1.user_id = auth.uid()
          and gm2.user_id = user_profiles.id
      )
    );
exception when duplicate_object then null;
end $$;

NOTIFY pgrst, 'reload schema';
