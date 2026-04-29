-- Emergency message urgency for scheduled maintenance rows: when any enabled row uses
-- 'high', only those rows participate in "current schedule" selection; if none set
-- urgency (all NULL / legacy), behavior is unchanged.
alter table public.maintenance_schedules
  add column if not exists message_urgency text;

alter table public.maintenance_schedules
  drop constraint if exists maintenance_schedules_message_urgency_check;

alter table public.maintenance_schedules
  add constraint maintenance_schedules_message_urgency_check
    check (
      message_urgency is null
      or message_urgency in ('normal', 'high')
    );

comment on column public.maintenance_schedules.message_urgency is
  'Optional: normal / high emergency. When any enabled row is high, only high-enabled rows are used for banners and schedule selection; if no row sets urgency, all enabled rows are considered.';

-- LP/app public announcement ordering (lower = earlier). Tie-break remains priority then created_at in app queries.
alter table public.app_announcements
  add column if not exists display_order integer not null default 0;

comment on column public.app_announcements.display_order is
  'Display order on LP and public strips (ascending); combined with priority/created_at in queries.';

create index if not exists idx_app_announcements_published_display_order
  on public.app_announcements (is_published, display_order asc, priority desc, created_at desc)
  where is_published = true;

notify pgrst, 'reload schema';
