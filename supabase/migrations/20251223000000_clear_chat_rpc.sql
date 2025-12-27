
-- Function to clear chat for all members (only if creator)
create or replace function public.clear_chat_for_all(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_created_by uuid;
begin
  v_current_user_id := auth.uid();

  -- Get conversation creator
  select created_by into v_created_by
  from public.conversations
  where id = p_conversation_id;

  -- Check permissions (must be creator)
  if v_created_by is distinct from v_current_user_id then
    raise exception 'Access denied: Only conversation creator can clear chat for everyone';
  end if;

  -- Update cleared_at
  update public.conversations
  set cleared_at = now()
  where id = p_conversation_id;

  -- Delete all messages in the conversation
  delete from public.messages
  where conversation_id = p_conversation_id;

end;
$$;
