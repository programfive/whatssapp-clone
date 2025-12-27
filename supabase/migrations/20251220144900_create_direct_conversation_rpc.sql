-- RPC helper to create a 1:1 conversation + membership in one transaction (avoids RLS errors from client inserts)

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
