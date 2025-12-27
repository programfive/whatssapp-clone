alter table public.messages
  add column if not exists media_name text,
  add column if not exists media_mime text,
  add column if not exists media_size integer;
