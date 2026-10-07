create sequence if not exists public.asset_record_id_seq;
create table if not exists public.asset_records (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique default ('AST-' || lpad(nextval('public.asset_record_id_seq')::text, 6, '0')),
  asset_category text not null,
  asset_data jsonb not null default '{"columns":[],"values":[]}'::jsonb,
  asset_status text not null default 'Active' check (asset_status in ('Active','Retired/In-Active')),
  asset_status_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.asset_records to authenticated;
grant all on public.asset_records to service_role;
grant usage, select on sequence public.asset_record_id_seq to authenticated, service_role;
alter table public.asset_records enable row level security;
create policy "Authenticated users can view asset records" on public.asset_records for select to authenticated using (true);
create policy "Authenticated users can insert asset records" on public.asset_records for insert to authenticated with check (true);
create policy "Authenticated users can update asset records" on public.asset_records for update to authenticated using (asset_status = 'Active') with check (asset_status in ('Active','Retired/In-Active'));
create or replace function public.prevent_retired_asset_update() returns trigger language plpgsql set search_path = public as $$
begin
  if old.asset_status = 'Retired/In-Active' then raise exception 'Retired assets cannot be edited or reactivated.'; end if;
  return new;
end; $$;
create trigger asset_records_prevent_retired_update before update on public.asset_records for each row execute function public.prevent_retired_asset_update();
create trigger trg_asset_records_touch before update on public.asset_records for each row execute function public.touch_updated_at();
notify pgrst, 'reload schema';