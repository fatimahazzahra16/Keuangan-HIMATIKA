-- Bucket foto bukti: PRIVATE. Hanya admin yang bisa baca/tulis.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti', 'bukti', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

create policy bukti_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'bukti' and (select public.is_admin()));

create policy bukti_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bukti' and (select public.is_admin()));

create policy bukti_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'bukti' and (select public.is_admin()))
  with check (bucket_id = 'bukti' and (select public.is_admin()));

create policy bukti_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'bukti' and (select public.is_admin()));
