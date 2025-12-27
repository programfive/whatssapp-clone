-- Create message_reactions table
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  
  -- Ensure a user can only have ONE reaction per message (can change emoji, but only one at a time)
  unique(message_id, user_id)
);

-- Index for faster queries
create index if not exists idx_message_reactions_message_id on public.message_reactions(message_id);
create index if not exists idx_message_reactions_user_id on public.message_reactions(user_id);
create index if not exists idx_message_reactions_conversation_id on public.message_reactions(conversation_id);

-- Enable RLS
alter table public.message_reactions enable row level security;

-- RLS Policies: Users can see reactions in conversations they're members of
create policy "Users can view reactions in their conversations"
  on public.message_reactions
  for select
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_members.conversation_id = message_reactions.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages in conversations they're members of
create policy "Users can add reactions to messages in their conversations"
  on public.message_reactions
  for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.conversation_members
      where conversation_members.conversation_id = message_reactions.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Users can delete their own reactions
create policy "Users can delete their own reactions"
  on public.message_reactions
  for delete
  using (user_id = auth.uid());

-- Users can update their own reactions (to change emoji)
create policy "Users can update their own reactions"
  on public.message_reactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Enable realtime for message_reactions
alter publication supabase_realtime add table public.message_reactions;
