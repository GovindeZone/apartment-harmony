create table if not exists public.asset_records (
  id uuid primary key default gen_random_uuid(),
  asset_category text not null,
  asset_data jsonb not null default '{}'::jsonb,
  asset_status text not null default 'Active' check (asset_status in ('Active', 'Retired')),
  asset_status_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_records_category_idx on public.asset_records (asset_category);
create index if not exists asset_records_status_idx on public.asset_records (asset_status);

create or replace function public.set_asset_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists asset_records_updated_at on public.asset_records;
create trigger asset_records_updated_at
before update on public.asset_records
for each row execute function public.set_asset_records_updated_at();

alter table public.asset_records enable row level security;

drop policy if exists "Authenticated users can view asset records" on public.asset_records;
create policy "Authenticated users can view asset records"
on public.asset_records for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert asset records" on public.asset_records;
create policy "Authenticated users can insert asset records"
on public.asset_records for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update asset records" on public.asset_records;
create policy "Authenticated users can update asset records"
on public.asset_records for update
to authenticated
using (true)
with check (true);
