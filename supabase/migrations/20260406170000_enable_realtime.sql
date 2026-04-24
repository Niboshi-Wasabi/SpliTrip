-- Supabase Realtime (Postgres Changes) を有効化する。
-- Enable Supabase Realtime (Postgres Changes) for core tables.
--
-- supabase_realtime publication にテーブルを追加すると、
-- クライアントから postgres_changes チャンネルで INSERT/UPDATE/DELETE を購読できる。
-- Adding tables to the supabase_realtime publication allows clients
-- to subscribe to INSERT/UPDATE/DELETE via postgres_changes channels.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_expenses'
  ) then
    alter publication supabase_realtime add table public.group_expenses;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'groups'
  ) then
    alter publication supabase_realtime add table public.groups;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
end
$$;
