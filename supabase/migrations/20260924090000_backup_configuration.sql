create table if not exists public.backup_configuration (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  frequency text not null default 'monthly' check (frequency in ('monthly')),
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  time_utc time not null default '18:30',
  recipient_emails text[] not null default '{}',
  retention_months integer not null default 12 check (retention_months between 1 and 120),
  backup_scope text not null default 'application_data' check (backup_scope in ('application_data','application_and_documents')),
  storage_status text not null default 'pending' check (storage_status in ('pending','configured','error')),
  email_status text not null default 'pending' check (email_status in ('pending','configured','error')),
  last_backup_at timestamptz,
  last_backup_status text,
  last_backup_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.backup_configuration enable row level security;

create policy "Admins can view backup configuration"
  on public.backup_configuration for select to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can insert backup configuration"
  on public.backup_configuration for insert to authenticated
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update backup configuration"
  on public.backup_configuration for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create index if not exists backup_configuration_updated_at_idx
  on public.backup_configuration(updated_at desc);

insert into public.backup_configuration (enabled)
select false
where not exists (select 1 from public.backup_configuration);

create or replace function public.touch_backup_configuration()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists backup_configuration_touch on public.backup_configuration;
create trigger backup_configuration_touch
before update on public.backup_configuration
for each row execute function public.touch_backup_configuration();
