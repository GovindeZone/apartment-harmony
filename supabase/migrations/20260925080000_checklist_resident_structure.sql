-- Make Checklist Master administration explicit and reliable for administrators.
alter table if exists public.checklist_master enable row level security;
drop policy if exists "Authenticated users can view active checklist master" on public.checklist_master;
drop policy if exists "Admins can manage checklist master" on public.checklist_master;
drop policy if exists "Admins can insert checklist master" on public.checklist_master;
drop policy if exists "Admins can update checklist master" on public.checklist_master;
drop policy if exists "Admins can delete checklist master" on public.checklist_master;

create policy "Authenticated users can view checklist master"
  on public.checklist_master for select to authenticated
  using (
    active = true
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert checklist master"
  on public.checklist_master for insert to authenticated
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update checklist master"
  on public.checklist_master for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete checklist master"
  on public.checklist_master for delete to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Apartment profile structure keeps floors as an editable master list alongside zones, blocks and gates.
alter table if exists public.apartment_settings
  add column if not exists floors text[] not null default '{}';

-- Resident administration: allow authenticated users with the existing admin role to create/edit residents.
alter table if exists public.residents enable row level security;
drop policy if exists "Admins can insert residents" on public.residents;
drop policy if exists "Admins can update residents" on public.residents;
create policy "Admins can insert residents"
  on public.residents for insert to authenticated
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
create policy "Admins can update residents"
  on public.residents for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
