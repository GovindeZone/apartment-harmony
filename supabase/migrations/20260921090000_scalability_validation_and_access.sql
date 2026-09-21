-- Scalability, validation and access-control foundation
-- This migration is additive and preserves existing application data.

-- Contact fields are stored as digits only; country codes belong in separate fields.
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS whatsapp_country_code text NOT NULL DEFAULT '+91';

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS whatsapp_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS aadhaar_document_path text,
  ADD COLUMN IF NOT EXISTS resume_document_path text;

ALTER TABLE public.gate_entries
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91';

-- Validate only non-empty values, allowing legacy NULLs.
ALTER TABLE public.residents DROP CONSTRAINT IF EXISTS residents_phone_digits_10;
ALTER TABLE public.residents ADD CONSTRAINT residents_phone_digits_10
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[0-9]{10}$');

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_phone_digits_10;
ALTER TABLE public.staff ADD CONSTRAINT staff_phone_digits_10
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[0-9]{10}$');

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_aadhaar_digits_12;
ALTER TABLE public.staff ADD CONSTRAINT staff_aadhaar_digits_12
  CHECK (aadhaar_number IS NULL OR aadhaar_number = '' OR aadhaar_number ~ '^[0-9]{12}$');

ALTER TABLE public.gate_entries DROP CONSTRAINT IF EXISTS gate_entries_phone_digits_10;
ALTER TABLE public.gate_entries ADD CONSTRAINT gate_entries_phone_digits_10
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[0-9]{10}$');

-- Tab-level permissions. Roles remain compatible with the existing app_role enum.
CREATE TABLE IF NOT EXISTS public.user_tab_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tab_permissions TO authenticated;
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions readable by authenticated" ON public.user_tab_permissions;
CREATE POLICY "permissions readable by authenticated" ON public.user_tab_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage permissions" ON public.user_tab_permissions;
CREATE POLICY "admins manage permissions" ON public.user_tab_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Useful indexes for large datasets and common dashboard/list filters.
CREATE INDEX IF NOT EXISTS idx_flats_status ON public.flats(status);
CREATE INDEX IF NOT EXISTS idx_flats_zone_block_floor ON public.flats(zone, block, floor);
CREATE INDEX IF NOT EXISTS idx_residents_flat_status ON public.residents(flat_id, status);
CREATE INDEX IF NOT EXISTS idx_residents_type_status ON public.residents(resident_type, status);
CREATE INDEX IF NOT EXISTS idx_residents_name_lower ON public.residents(lower(full_name));
CREATE INDEX IF NOT EXISTS idx_staff_department_status ON public.staff(department, status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_staff ON public.staff_attendance(attendance_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_entry_time ON public.gate_entries(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_gate_entries_flat_id ON public.gate_entries(flat_id);
CREATE INDEX IF NOT EXISTS idx_user_tab_permissions_user ON public.user_tab_permissions(user_id);

-- Updated-at maintenance for permission records.
DROP TRIGGER IF EXISTS trg_user_tab_permissions_touch ON public.user_tab_permissions;
CREATE TRIGGER trg_user_tab_permissions_touch
  BEFORE UPDATE ON public.user_tab_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage metadata is kept in the existing staff_documents table.
-- Actual files should be uploaded to a private Supabase Storage bucket by the UI.
