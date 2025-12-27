-- RESTORE TITLE SAVING FOR DIRECT CONVERSATIONS
-- Run this in your Supabase SQL Editor

-- Update create_direct_conversation to USE the provided title (p_title)
create or replace function public.create_direct_conversation(
  p_other_user_id uuid,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_me uuid;
begin
  v_me := auth.uid();
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify other user exists
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'User not found';
  end if;

  -- Check if conversation already exists
  select cm1.conversation_id into v_conversation_id
  from public.conversation_members cm1
  join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
  join public.conversations c on cm1.conversation_id = c.id
  where cm1.user_id = v_me 
    and cm2.user_id = p_other_user_id
    and c.is_group = false
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  -- CHANGE: Use p_title instead of null
  insert into public.conversations (is_group, title, created_by)
  values (false, p_title, v_me) 
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (v_conversation_id, v_me, 'member'),
    (v_conversation_id, p_other_user_id, 'member');

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid, text) from public;
grant execute on function public.create_direct_conversation(uuid, text) to authenticated;
