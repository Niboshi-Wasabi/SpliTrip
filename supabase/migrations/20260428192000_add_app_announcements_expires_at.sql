alter table public.app_announcements
  add column if not exists expires_at timestamptz;

comment on column public.app_announcements.expires_at is
  '公開期限（UTC）。null の場合は無期限。is_published=true かつ expires_at が未来/NULL の間のみ表示対象。';

create index if not exists idx_app_announcements_active_window
  on public.app_announcements (is_published, expires_at, priority desc, created_at desc);
