create table if not exists public.checklist_master (
  id uuid primary key default gen_random_uuid(),
  department text not null check (department in ('FM','MC','Security','Electrical','STP','Plumbing','House Keeping','Garden')),
  task text not null,
  frequency text not null check (frequency in ('Daily','Weekly','Monthly','Quarterly','Half-Yearly','Yearly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.checklist_master enable row level security;
create policy "Authenticated users can view active checklist master" on public.checklist_master for select to authenticated using (active = true or exists (select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create policy "Admins can manage checklist master" on public.checklist_master for all to authenticated using (exists (select 1 from public.user_roles where user_id=auth.uid() and role='admin')) with check (exists (select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create index if not exists checklist_master_department_active_idx on public.checklist_master(department, active);