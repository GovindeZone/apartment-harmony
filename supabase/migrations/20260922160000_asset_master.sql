create table if not exists public.asset_master (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('Electrical Item','Tools','Furniture','Motors','Pipe Items','Other Items')),
  asset_name text not null,
  asset_code text,
  description text,
  quantity numeric not null default 1,
  location text,
  purchase_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.asset_master enable row level security;
create policy "Authenticated users can view assets" on public.asset_master for select to authenticated using (true);
create policy "Admins can insert assets" on public.asset_master for insert to authenticated with check (exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
create policy "Users with asset edit rights can update assets" on public.asset_master for update to authenticated using (
 exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
 or exists(select 1 from public.user_rights where user_id=auth.uid() and permission='asset_edit')
) with check (
 exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
 or exists(select 1 from public.user_rights where user_id=auth.uid() and permission='asset_edit')
);
create index if not exists asset_master_type_idx on public.asset_master(asset_type);