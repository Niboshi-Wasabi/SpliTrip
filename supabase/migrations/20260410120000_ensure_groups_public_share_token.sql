-- 本番などで `20260408120000_world_class_extensions.sql` が未適用のままだった場合の追補。
-- 内容は同マイグレーション内の groups.public_share_token 定義と同一。`if not exists` のため
-- world_class 適用済みの環境で二重適用しても問題ない。

alter table public.groups
  add column if not exists public_share_token uuid not null default gen_random_uuid();

create unique index if not exists groups_public_share_token_key
  on public.groups (public_share_token);

comment on column public.groups.public_share_token is
  'Secret token for read-only /groups/[id]/shared?t=... summary (no login).';
