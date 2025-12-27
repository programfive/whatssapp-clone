create table if not exists public.user_favorite_conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create index if not exists user_favorite_conversations_user_id_idx
  on public.user_favorite_conversations (user_id);

create index if not exists user_favorite_conversations_conversation_id_idx
  on public.user_favorite_conversations (conversation_id);

alter table public.user_favorite_conversations enable row level security;

create policy user_favorite_conversations_select_self
on public.user_favorite_conversations
for select
to authenticated
using (user_id = auth.uid());

create policy user_favorite_conversations_insert_self
on public.user_favorite_conversations
for insert
to authenticated
with check (user_id = auth.uid());

create policy user_favorite_conversations_delete_self
on public.user_favorite_conversations
for delete
to authenticated
using (user_id = auth.uid());
