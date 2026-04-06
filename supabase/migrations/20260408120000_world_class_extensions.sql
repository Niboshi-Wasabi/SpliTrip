-- SpliTrip: payment_links JSONB, guest flag, split mode enum, expense comments, public share token.
-- 要件の public.expenses は既存の group_expenses を拡張（テーブル名は維持）。

-- ---------------------------------------------------------------------------
-- ENUM: persisted split mode on group_expenses (UI の高度な割り方と対応)
-- ITEMIZED は明細行モード（アプリ既存）を保持するため追加。
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.expense_split_mode as enum (
    'EQUAL',
    'EXACT',
    'PERCENTAGE',
    'SHARES',
    'ITEMIZED'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.group_expenses
  add column if not exists split_type public.expense_split_mode not null default 'EQUAL';

comment on column public.group_expenses.split_type is
  'How burden was computed: EQUAL | EXACT | PERCENTAGE | SHARES | ITEMIZED';

-- ---------------------------------------------------------------------------
-- user_profiles: 複数送金 URL（JSON 配列）。例: [{"url":"https://..."}, ...]
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists payment_links jsonb not null default '[]'::jsonb;

comment on column public.user_profiles.payment_links is
  'Array of objects: [{ "url": "https://..." , "label": "optional" }] for settlement deep links.';

-- Backfill from legacy columns into payment_links (best-effort URLs).
update public.user_profiles up
set payment_links = coalesce(
  (
    select jsonb_agg(q.elem)
    from (
      select jsonb_build_object(
        'url',
        'https://www.paypal.com/paypalme/' || btrim(up.paypal_me_id)
      ) as elem
      where up.paypal_me_id is not null and btrim(up.paypal_me_id) <> ''
      union all
      select jsonb_build_object(
        'url',
        'https://cash.app/$' || regexp_replace(btrim(up.cash_app_cashtag), '^\$', '')
      ) as elem
      where up.cash_app_cashtag is not null and btrim(up.cash_app_cashtag) <> ''
    ) q
  ),
  '[]'::jsonb
)
where (payment_links is null or payment_links = '[]'::jsonb)
  and (
    (up.paypal_me_id is not null and btrim(up.paypal_me_id) <> '')
    or (up.cash_app_cashtag is not null and btrim(up.cash_app_cashtag) <> '')
  );

-- ---------------------------------------------------------------------------
-- group_members: ゲスト（匿名サインイン等）フラグ
-- ---------------------------------------------------------------------------
alter table public.group_members
  add column if not exists is_guest boolean not null default false;

comment on column public.group_members.is_guest is
  'True when the participant joined without a full OAuth account (e.g. anonymous guest).';

-- ---------------------------------------------------------------------------
-- groups: 閲覧専用共有用トークン（URL で渡す）
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists public_share_token uuid not null default gen_random_uuid();

create unique index if not exists groups_public_share_token_key
  on public.groups (public_share_token);

comment on column public.groups.public_share_token is
  'Secret token for read-only /groups/[id]/shared?t=... summary (no login).';

-- ---------------------------------------------------------------------------
-- expense_comments（出費へのコメント）
-- ---------------------------------------------------------------------------
create table if not exists public.expense_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.group_expenses (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  constraint expense_comments_body_len check (char_length(body) <= 2000)
);

create index if not exists expense_comments_expense_id_idx
  on public.expense_comments (expense_id);

alter table public.expense_comments enable row level security;

do $$ begin
  create policy "expense_comments_select_members"
  on public.expense_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_expenses ge
      where ge.id = expense_comments.expense_id
        and public.is_group_member(ge.group_id, (select auth.uid()))
    )
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "expense_comments_insert_members"
  on public.expense_comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.group_expenses ge
      where ge.id = expense_comments.expense_id
        and public.is_group_member(ge.group_id, (select auth.uid()))
    )
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- insert_expense_with_splits: split_type を保存
-- ---------------------------------------------------------------------------
drop function if exists public.insert_expense_with_splits(uuid, uuid, numeric, text, date, jsonb, text, text);

create or replace function public.insert_expense_with_splits(
  p_group_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_expense_date date,
  p_splits jsonb,
  p_category text default 'other',
  p_receipt_url text default null,
  p_split_type public.expense_split_mode default 'EQUAL'
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  _expense_id uuid;
  _is_member  boolean;
  _cat text;
begin
  select public.is_group_member(p_group_id, auth.uid()) into _is_member;
  if not _is_member then
    raise exception 'forbidden: caller is not a member of this group';
  end if;

  if not public.is_group_member(p_group_id, p_payer_id) then
    raise exception 'invalid_payer: payer is not a member of this group';
  end if;

  _cat := coalesce(nullif(trim(p_category), ''), 'other');
  if _cat not in ('food', 'transport', 'lodging', 'sightseeing', 'other') then
    raise exception 'invalid_category';
  end if;

  insert into public.group_expenses (
    group_id, payer_id, amount, description, expense_date, category, receipt_url, split_type
  )
  values (
    p_group_id, p_payer_id, p_amount, p_description, p_expense_date, _cat, p_receipt_url,
    coalesce(p_split_type, 'EQUAL')
  )
  returning id into _expense_id;

  insert into public.expense_splits (expense_id, user_id, amount, ratio)
  select
    _expense_id,
    (s->>'user_id')::uuid,
    (s->>'amount')::numeric,
    (s->>'ratio')::numeric
  from jsonb_array_elements(p_splits) as s;

  return _expense_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_group_member_profiles: payment_links + is_guest
-- ---------------------------------------------------------------------------
create or replace function public.get_group_member_profiles(p_group_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  paypal_me_id text,
  cash_app_cashtag text,
  payment_links jsonb,
  is_guest boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    up.id,
    coalesce(up.display_name, 'ユーザー'),
    up.avatar_url,
    up.paypal_me_id,
    up.cash_app_cashtag,
    coalesce(up.payment_links, '[]'::jsonb),
    coalesce(gm.is_guest, false)
  from public.group_members gm
  join public.user_profiles up on up.id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id, auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- update_own_payment_methods: payment_links も更新可能に
-- ---------------------------------------------------------------------------
drop function if exists public.update_own_payment_methods(text, text);

create or replace function public.update_own_payment_methods(
  p_paypal_me_id text,
  p_cash_app_cashtag text,
  p_payment_links jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  _links jsonb;
begin
  if p_payment_links is null then
    _links := null;
  elsif jsonb_typeof(p_payment_links) <> 'array' then
    _links := '[]'::jsonb;
  else
    _links := p_payment_links;
  end if;

  insert into public.user_profiles (id, display_name, paypal_me_id, cash_app_cashtag, payment_links)
  values (auth.uid(), 'ユーザー', p_paypal_me_id, p_cash_app_cashtag, coalesce(_links, '[]'::jsonb))
  on conflict (id) do update set
    paypal_me_id = excluded.paypal_me_id,
    cash_app_cashtag = excluded.cash_app_cashtag,
    payment_links = case
      when _links is null then public.user_profiles.payment_links
      else excluded.payment_links
    end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read-only shared summary (no JWT): token must match group row.
-- 閲覧専用サマリー。トークンが一致する場合のみ JSON を返す。
-- ---------------------------------------------------------------------------
create or replace function public.get_group_shared_summary(
  p_group_id uuid,
  p_share_token uuid
)
returns json
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  g record;
begin
  select id, name, currency_code, public_share_token
  into g
  from public.groups
  where id = p_group_id;

  if not found then
    return null;
  end if;

  if g.public_share_token is distinct from p_share_token then
    return null;
  end if;

  return json_build_object(
    'group_id', g.id,
    'name', g.name,
    'currency_code', g.currency_code
  );
end;
$$;

grant execute on function public.get_group_shared_summary(uuid, uuid) to anon, authenticated;

-- Mark current user row as guest (e.g. anonymous sign-in) — members cannot UPDATE RLS directly.
create or replace function public.set_own_member_guest_flag(
  p_group_id uuid,
  p_is_guest boolean
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.group_members
  set is_guest = p_is_guest
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

notify pgrst, 'reload schema';
