create table if not exists public.status_views (
  status_id uuid not null references public.statuses(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

create index if not exists status_views_viewer_idx on public.status_views(viewer_id);

alter table public.status_views enable row level security;

create policy status_views_select_self
on public.status_views
for select
to authenticated
using (viewer_id = auth.uid());

create policy status_views_insert_self
on public.status_views
for insert
to authenticated
with check (viewer_id = auth.uid());

create policy status_views_delete_self
on public.status_views
for delete
to authenticated
using (viewer_id = auth.uid());
