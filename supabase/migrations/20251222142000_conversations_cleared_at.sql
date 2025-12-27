alter table public.conversations
add column if not exists cleared_at timestamptz;
