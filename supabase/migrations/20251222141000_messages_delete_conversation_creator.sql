alter table public.messages enable row level security;

create policy messages_delete_if_conversation_creator
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.created_by = auth.uid()
  )
);
