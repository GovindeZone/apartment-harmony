-- Private storage bucket for staff Aadhaar/resume documents.
insert into storage.buckets (id, name, public)
values ('staff-documents', 'staff-documents', false)
on conflict (id) do nothing;

drop policy if exists "staff documents authenticated read" on storage.objects;
create policy "staff documents authenticated read" on storage.objects
for select to authenticated using (bucket_id = 'staff-documents');

drop policy if exists "staff documents authenticated upload" on storage.objects;
create policy "staff documents authenticated upload" on storage.objects
for insert to authenticated with check (bucket_id = 'staff-documents');

drop policy if exists "staff documents authenticated delete" on storage.objects;
create policy "staff documents authenticated delete" on storage.objects
for delete to authenticated using (bucket_id = 'staff-documents');
