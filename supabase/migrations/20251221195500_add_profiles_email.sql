-- Add email to profiles and keep it in sync with auth.users

alter table public.profiles
add column if not exists email text;

-- Backfill existing profiles.email from auth.users.email
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- Update the trigger function to populate email on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email = coalesce(public.profiles.email, excluded.email);

  return new;
end;
$$;
