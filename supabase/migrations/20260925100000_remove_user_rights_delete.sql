-- Delete rights are no longer part of the application permission model.
alter table if exists public.user_tab_permissions drop column if exists can_delete;
