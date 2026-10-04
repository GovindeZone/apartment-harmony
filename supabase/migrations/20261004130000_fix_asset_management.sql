create sequence if not exists public.asset_record_id_seq;

alter table public.asset_records
  add column if not exists asset_id text;

update public.asset_records
set asset_id = 'AST-' || lpad(nextval('public.asset_record_id_seq')::text, 6, '0')
where asset_id is null;

select setval(
  'public.asset_record_id_seq',
  coalesce(
    (select max(substring(asset_id from 5)::bigint)
     from public.asset_records
     where asset_id ~ '^AST-[0-9]+$'),
    1
  ),
  false
);

alter table public.asset_records
  alter column asset_id set default ('AST-' || lpad(nextval('public.asset_record_id_seq')::text, 6, '0'));

alter table public.asset_records
  alter column asset_id set not null;

create unique index if not exists asset_records_asset_id_key on public.asset_records (asset_id);

alter table public.asset_records
  drop constraint if exists asset_records_asset_status_check;

update public.asset_records
set asset_status = 'Retired/In-Active'
where asset_status = 'Retired';

alter table public.asset_records
  add constraint asset_records_asset_status_check
  check (asset_status in ('Active', 'Retired/In-Active'));

create or replace function public.prevent_retired_asset_update()
returns trigger
language plpgsql
as $$
begin
  if old.asset_status = 'Retired/In-Active' then
    raise exception 'Retired assets cannot be edited or reactivated.';
  end if;

  return new;
end;
$$;

drop trigger if exists asset_records_prevent_retired_update on public.asset_records;
create trigger asset_records_prevent_retired_update
before update on public.asset_records
for each row
execute function public.prevent_retired_asset_update();

drop policy if exists "Authenticated users can update asset records" on public.asset_records;
create policy "Authenticated users can update asset records"
on public.asset_records for update
to authenticated
using (asset_status = 'Active')
with check (asset_status in ('Active', 'Retired/In-Active'));

notify pgrst, 'reload schema';
