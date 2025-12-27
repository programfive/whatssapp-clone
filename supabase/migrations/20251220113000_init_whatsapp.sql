create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create a public profile row automatically when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  about text,
  phone text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  photo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_created_by_idx on public.conversations(created_by);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx on public.conversation_members(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  message_type text not null default 'text',
  media_url text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists messages_sender_id_idx on public.messages(sender_id);

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text,
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists statuses_user_expires_idx on public.statuses(user_id, expires_at);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists channels_created_by_idx on public.channels(created_by);

create trigger channels_set_updated_at
before update on public.channels
for each row execute function public.set_updated_at();

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists channel_members_user_id_idx on public.channel_members(user_id);

create table if not exists public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text,
  media_url text,
  created_at timestamptz not null default now()
);

create index if not exists channel_posts_channel_created_at_idx on public.channel_posts(channel_id, created_at);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communities_created_by_idx on public.communities(created_by);

create trigger communities_set_updated_at
before update on public.communities
for each row execute function public.set_updated_at();

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_members_user_id_idx on public.community_members(user_id);

create table if not exists public.community_channels (
  community_id uuid not null references public.communities(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  primary key (community_id, channel_id)
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.statuses enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.channel_posts enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_channels enable row level security;

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy conversations_select_if_member
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
);

create policy conversations_insert_creator
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy conversations_update_creator
on public.conversations
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy conversations_delete_creator
on public.conversations
for delete
to authenticated
using (created_by = auth.uid());

create policy conversation_members_select_if_member
on public.conversation_members
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members me
    where me.conversation_id = conversation_members.conversation_id
      and me.user_id = auth.uid()
  )
);

create policy conversation_members_insert_by_creator
on public.conversation_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.created_by = auth.uid()
  )
);

create policy conversation_members_delete_by_creator_or_self
on public.conversation_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.created_by = auth.uid()
  )
);

create policy messages_select_if_member
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy messages_insert_if_member
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy messages_update_self
on public.messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy messages_delete_self
on public.messages
for delete
to authenticated
using (sender_id = auth.uid());

create policy statuses_select_authenticated_unexpired
on public.statuses
for select
to authenticated
using (expires_at > now());

create policy statuses_insert_self
on public.statuses
for insert
to authenticated
with check (user_id = auth.uid());

create policy statuses_update_self
on public.statuses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy statuses_delete_self
on public.statuses
for delete
to authenticated
using (user_id = auth.uid());

create policy channels_select_authenticated
on public.channels
for select
to authenticated
using (true);

create policy channels_insert_creator
on public.channels
for insert
to authenticated
with check (created_by = auth.uid());

create policy channels_update_creator
on public.channels
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy channels_delete_creator
on public.channels
for delete
to authenticated
using (created_by = auth.uid());

create policy channel_members_select_if_member
on public.channel_members
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_members me
    where me.channel_id = channel_members.channel_id
      and me.user_id = auth.uid()
  )
);

create policy channel_members_insert_by_creator
on public.channel_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.channels c
    where c.id = channel_members.channel_id
      and c.created_by = auth.uid()
  )
);

create policy channel_members_delete_by_creator_or_self
on public.channel_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.channels c
    where c.id = channel_members.channel_id
      and c.created_by = auth.uid()
  )
);

create policy channel_posts_select_if_member
on public.channel_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.channel_members cm
    where cm.channel_id = channel_posts.channel_id
      and cm.user_id = auth.uid()
  )
);

create policy channel_posts_insert_if_member
on public.channel_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.channel_members cm
    where cm.channel_id = channel_posts.channel_id
      and cm.user_id = auth.uid()
  )
);

create policy channel_posts_update_self
on public.channel_posts
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy channel_posts_delete_self
on public.channel_posts
for delete
to authenticated
using (author_id = auth.uid());

create policy communities_select_authenticated
on public.communities
for select
to authenticated
using (true);

create policy communities_insert_creator
on public.communities
for insert
to authenticated
with check (created_by = auth.uid());

create policy communities_update_creator
on public.communities
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy communities_delete_creator
on public.communities
for delete
to authenticated
using (created_by = auth.uid());

create policy community_members_select_if_member
on public.community_members
for select
to authenticated
using (
  exists (
    select 1
    from public.community_members me
    where me.community_id = community_members.community_id
      and me.user_id = auth.uid()
  )
);

create policy community_members_insert_by_creator
on public.community_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and c.created_by = auth.uid()
  )
);

create policy community_members_delete_by_creator_or_self
on public.community_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and c.created_by = auth.uid()
  )
);

create policy community_channels_select_if_member
on public.community_channels
for select
to authenticated
using (
  exists (
    select 1
    from public.community_members cm
    where cm.community_id = community_channels.community_id
      and cm.user_id = auth.uid()
  )
);

create policy community_channels_insert_by_creator
on public.community_channels
for insert
to authenticated
with check (
  exists (
    select 1
    from public.communities c
    where c.id = community_channels.community_id
      and c.created_by = auth.uid()
  )
);

create policy community_channels_delete_by_creator
on public.community_channels
for delete
to authenticated
using (
  exists (
    select 1
    from public.communities c
    where c.id = community_channels.community_id
      and c.created_by = auth.uid()
  )
);
