create policy conversation_members_update_self
on public.conversation_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
