insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists avatars_select_authenticated on storage.objects;
drop policy if exists avatars_insert_own_folder on storage.objects;
drop policy if exists avatars_update_own_folder on storage.objects;
drop policy if exists avatars_delete_own_folder on storage.objects;

create policy avatars_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy avatars_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'avatar'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy avatars_update_own_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'avatar'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'avatar'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy avatars_delete_own_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'avatar'
  and (storage.foldername(name))[2] = auth.uid()::text
);
