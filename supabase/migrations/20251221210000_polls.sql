create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (message_id, voter_id, option_index)
);

create index if not exists poll_votes_message_id_idx on public.poll_votes(message_id);
create index if not exists poll_votes_voter_id_idx on public.poll_votes(voter_id);

alter table public.poll_votes enable row level security;

create policy poll_votes_select_if_conversation_member
on public.poll_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = poll_votes.message_id
      and cm.user_id = auth.uid()
  )
);

create policy poll_votes_insert_if_conversation_member
on public.poll_votes
for insert
to authenticated
with check (
  voter_id = auth.uid()
  and exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = poll_votes.message_id
      and cm.user_id = auth.uid()
  )
);

create policy poll_votes_delete_self_if_conversation_member
on public.poll_votes
for delete
to authenticated
using (
  voter_id = auth.uid()
  and exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = poll_votes.message_id
      and cm.user_id = auth.uid()
  )
);

alter publication supabase_realtime add table public.poll_votes;
alter table public.poll_votes replica identity full;
