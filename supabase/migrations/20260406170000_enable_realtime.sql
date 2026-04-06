-- Supabase Realtime (Postgres Changes) を有効化する。
-- Enable Supabase Realtime (Postgres Changes) for core tables.
--
-- supabase_realtime publication にテーブルを追加すると、
-- クライアントから postgres_changes チャンネルで INSERT/UPDATE/DELETE を購読できる。
-- Adding tables to the supabase_realtime publication allows clients
-- to subscribe to INSERT/UPDATE/DELETE via postgres_changes channels.

alter publication supabase_realtime add table public.group_expenses;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;
