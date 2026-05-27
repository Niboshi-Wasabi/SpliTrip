-- Allow admins to freeze a component row so scheduled health probes skip overwriting incident comms.

alter table public.system_status
  add column if not exists pinned_by_admin boolean not null default false;

comment on column public.system_status.pinned_by_admin is
  'When true, GET /api/cron/system-status skips updating this service_key so manual incident status persists.';

notify pgrst, 'reload schema';
