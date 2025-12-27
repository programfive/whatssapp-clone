-- Migration to fix chat display issues
-- Run this in your Supabase SQL Editor

-- 1. Update create_direct_conversation to force NULL title
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

  -- Force title to be NULL for direct chats so we can dynamicall resolve names
  insert into public.conversations (is_group, title, created_by)
  values (false, null, v_me)
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

-- 2. Update get_chat_summaries to return all necessary fields
create or replace function public.get_chat_summaries()
returns table (
  conversation_id uuid,
  title text,
  last_message text,
  last_time timestamptz,
  unread_count bigint,
  last_read_at timestamptz,
  is_group boolean,
  photo_url text,
  last_message_id uuid,
  message_type text,
  media_name text
)
language sql
security definer
set search_path = public
as $$
  with my_conversations as (
    select
      cm.conversation_id,
      cm.last_read_at
    from public.conversation_members cm
    where cm.user_id = auth.uid()
  ),
  last_msg as (
    select distinct on (m.conversation_id)
      m.conversation_id,
      m.id as message_id,
      m.body as last_message,
      m.created_at as last_time,
      m.message_type,
      m.media_name
    from public.messages m
    join my_conversations mc on mc.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  ),
  reading_status as (
      select 
        m.conversation_id,
        count(*)::bigint as unread_count
      from public.messages m
      join my_conversations mc on mc.conversation_id = m.conversation_id
      where m.sender_id <> auth.uid()
        and (mc.last_read_at is null or m.created_at > mc.last_read_at)
      group by m.conversation_id
  )
  select
    c.id as conversation_id,
    c.title, -- Keep original title for groups
    lm.last_message,
    lm.last_time,
    coalesce(rs.unread_count, 0) as unread_count,
    mc.last_read_at,
    c.is_group,
    c.photo_url,
    lm.message_id as last_message_id,
    lm.message_type,
    lm.media_name
  from my_conversations mc
  join public.conversations c on c.id = mc.conversation_id
  left join last_msg lm on lm.conversation_id = c.id
  left join reading_status rs on rs.conversation_id = c.id
  order by lm.last_time desc nulls last;
$$;

revoke all on function public.get_chat_summaries() from public;
grant execute on function public.get_chat_summaries() to authenticated;
