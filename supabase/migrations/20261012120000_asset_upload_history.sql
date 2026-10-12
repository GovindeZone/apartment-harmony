-- Asset file upload history: immutable file metadata for regular users, admin-only soft deletion.
create table if not exists public.asset_upload_history (
  id uuid primary key default gen_random_uuid(),
  asset_group_category text not null check (length(trim(asset_group_category)) > 0),
  asset_type text not null check (length(trim(asset_type)) > 0),
  remarks text not null check (length(trim(remarks)) > 0),
  original_file_name text not null,
  storage_path text not null unique,
  file_extension text not null check (file_extension in ('xlsx', 'xls', 'csv', 'txt')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  content_type text,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz,
  deletion_reason text,
  constraint asset_upload_delete_audit_check check (
    (is_deleted = false and deleted_by is null and deleted_at is null and deletion_reason is null)
    or (is_deleted = true and deleted_by is not null and deleted_at is not null and length(trim(coalesce(deletion_reason, ''))) > 0)
  )
);
alter table public.asset_upload_history enable row level security;

drop policy if exists "Authenticated users can view asset upload history" on public.asset_upload_history;
create policy "Authenticated users can view asset upload history"
on public.asset_upload_history for select to authenticated using (true);

drop policy if exists "Authenticated users can upload asset file history" on public.asset_upload_history;
create policy "Authenticated users can upload asset file history"
on public.asset_upload_history for insert to authenticated
with check (uploaded_by = auth.uid() and is_deleted = false and deleted_by is null and deleted_at is null and deletion_reason is null);

drop policy if exists "Only admins can soft delete asset upload history" on public.asset_upload_history;
create policy "Only admins can soft delete asset upload history"
on public.asset_upload_history for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  and is_deleted = true and deleted_by = auth.uid() and deleted_at is not null
  and length(trim(coalesce(deletion_reason, ''))) > 0
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('asset-upload-files', 'asset-upload-files', false, 20971520,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv','text/plain','application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload asset files" on storage.objects;
create policy "Authenticated users can upload asset files" on storage.objects for insert to authenticated
with check (bucket_id = 'asset-upload-files');

drop policy if exists "Authenticated users can read asset files" on storage.objects;
create policy "Authenticated users can read asset files" on storage.objects for select to authenticated
using (bucket_id = 'asset-upload-files');

drop policy if exists "Only admins can delete asset files" on storage.objects;
create policy "Only admins can delete asset files" on storage.objects for delete to authenticated
using (bucket_id = 'asset-upload-files' and exists (
  select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'
));
-- Intentionally no UPDATE policy: stored files cannot be replaced in place.
