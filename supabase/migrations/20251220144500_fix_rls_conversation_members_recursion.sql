-- Fix infinite recursion in RLS policies that referenced conversation_members inside its own policies

create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;

drop policy if exists conversation_members_select_if_member on public.conversation_members;
create policy conversation_members_select_if_member
on public.conversation_members
for select
to authenticated
using (
  public.is_conversation_member(conversation_members.conversation_id, auth.uid())
);

drop policy if exists conversations_select_if_member on public.conversations;
create policy conversations_select_if_member
on public.conversations
for select
to authenticated
using (
  public.is_conversation_member(conversations.id, auth.uid())
);

drop policy if exists messages_select_if_member on public.messages;
create policy messages_select_if_member
on public.messages
for select
to authenticated
using (
  public.is_conversation_member(messages.conversation_id, auth.uid())
);

drop policy if exists messages_insert_if_member on public.messages;
create policy messages_insert_if_member
on public.messages
for insert
to authenticated
with check (
  public.is_conversation_member(messages.conversation_id, auth.uid())
  and messages.sender_id = auth.uid()
);
