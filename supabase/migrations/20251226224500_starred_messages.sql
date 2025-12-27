create table if not exists starred_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  message_id uuid references messages(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, message_id)
);

alter table starred_messages enable row level security;

create policy "Users can view their own starred messages"
  on starred_messages for select
  using (auth.uid() = user_id);

create policy "Users can star messages"
  on starred_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can unstar messages"
  on starred_messages for delete
  using (auth.uid() = user_id);
