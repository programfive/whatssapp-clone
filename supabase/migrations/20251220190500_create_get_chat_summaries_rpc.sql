create or replace function public.get_chat_summaries()
returns table (
  conversation_id uuid,
  title text,
  last_message text,
  last_time timestamptz,
  unread_count bigint,
  last_read_at timestamptz
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
      m.body as last_message,
      m.created_at as last_time
    from public.messages m
    join my_conversations mc on mc.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  ),
  unread as (
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
    coalesce(nullif(trim(c.title), ''), 'Chat') as title,
    lm.last_message,
    lm.last_time,
    coalesce(u.unread_count, 0) as unread_count,
    mc.last_read_at
  from my_conversations mc
  join public.conversations c on c.id = mc.conversation_id
  left join last_msg lm on lm.conversation_id = c.id
  left join unread u on u.conversation_id = c.id
  order by lm.last_time desc nulls last;
$$;

revoke all on function public.get_chat_summaries() from public;
grant execute on function public.get_chat_summaries() to authenticated;
