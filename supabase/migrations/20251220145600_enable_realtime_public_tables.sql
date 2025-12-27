-- Enable Supabase Realtime (postgres_changes) for core public tables

-- Add tables to the publication used by Supabase Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;

-- Ensure replica identity supports change payloads (especially for updates/deletes)
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter table public.conversation_members replica identity full;
