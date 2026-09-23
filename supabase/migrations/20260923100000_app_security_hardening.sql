-- Application security hardening for Indus Anantya Apartment
-- Adds disabled-user enforcement, audit logging, immutable critical assets,
-- and reusable role/permission helpers.

create schema if not exists private;

alter table if exists public.profiles
  add column if not exists is_active boolean not null default true;

create or replace function public.is_current_user_active()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and coalesce(is_active, true) = true
  );
$$;

revoke execute on function public.is_current_user_active() from public, anon;
grant execute on function public.is_current_user_active() to authenticated;

create or replace function public.has_app_role(required_role text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

revoke execute on function public.has_app_role(text) from public, anon;
grant execute on function public.has_app_role(text) to authenticated;

create table if not exists public.app_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('CREATE','UPDATE','DISABLE','ENABLE','APPROVE','DELETE_ATTEMPT','LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT')),
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_audit_log enable row level security;

drop policy if exists "Admins can view audit log" on public.app_audit_log;
create policy "Admins can view audit log"
  on public.app_audit_log
  for select
  to authenticated
  using ((select public.has_app_role('admin')));

revoke insert, update, delete on public.app_audit_log from anon, authenticated;

create or replace function public.write_app_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_json jsonb;
  new_json jsonb;
  action_name text;
  row_id text;
begin
  old_json := case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else null end;
  new_json := case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) else null end;
  row_id := coalesce(new_json->>'id', old_json->>'id');

  action_name := case TG_OP
    when 'INSERT' then 'CREATE'
    when 'UPDATE' then
      case
        when TG_TABLE_NAME = 'profiles' and (old_json->>'is_active') = 'true' and (new_json->>'is_active') = 'false' then 'DISABLE'
        when TG_TABLE_NAME = 'profiles' and (old_json->>'is_active') = 'false' and (new_json->>'is_active') = 'true' then 'ENABLE'
        else 'UPDATE'
      end
    when 'DELETE' then 'DELETE_ATTEMPT'
  end;

  insert into public.app_audit_log (
    actor_user_id, action, table_name, record_id, old_data, new_data
  )
  values (
    auth.uid(), action_name, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    row_id, old_json, new_json
  );

  return coalesce(NEW, OLD);
end;
$$;

revoke execute on function public.write_app_audit() from public, anon, authenticated;

-- Audit critical application data when the tables exist.
do $$
declare
  t text;
begin
  foreach t in array array[
    'asset_master',
    'checklist_master',
    'user_tab_permissions',
    'user_roles',
    'profiles'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%I on public.%I', t, t);
      execute format(
        'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.write_app_audit()',
        t, t
      );
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Assets are intentionally immutable: no authenticated delete path and a
-- database-level guard prevents accidental deletion even if a future policy
-- is added.
create or replace function public.prevent_asset_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  insert into public.app_audit_log (
    actor_user_id, action, table_name, record_id, old_data, metadata
  )
  values (
    auth.uid(), 'DELETE_ATTEMPT', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    OLD.id::text, to_jsonb(OLD), jsonb_build_object('blocked', true)
  );
  raise exception 'Asset records cannot be deleted. Disable or update the asset instead.';
end;
$;

revoke execute on function public.prevent_asset_delete() from public, anon, authenticated;

do $
begin
  if to_regclass('public.asset_master') is not null then
    revoke delete on public.asset_master from anon, authenticated;
    execute 'drop trigger if exists prevent_asset_delete on public.asset_master';
    execute 'create trigger prevent_asset_delete before delete on public.asset_master for each row execute function public.prevent_asset_delete()';
  end if;
end $;

-- Audit/status indexes.
create index if not exists app_audit_log_created_at_idx on public.app_audit_log(created_at desc);
create index if not exists app_audit_log_actor_idx on public.app_audit_log(actor_user_id);
create index if not exists profiles_is_active_idx on public.profiles(is_active);

comment on table public.app_audit_log is 'Security audit trail for application changes and sensitive actions.';
comment on column public.profiles.is_active is 'When false, the application denies access without deleting historical records.';
