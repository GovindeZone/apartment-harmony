ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS whatsapp_country_code text NOT NULL DEFAULT '+91';

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS whatsapp_country_code text NOT NULL DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS aadhaar_document_path text,
  ADD COLUMN IF NOT EXISTS resume_document_path text,
  ADD COLUMN IF NOT EXISTS staff_type text NOT NULL DEFAULT 'Permanent';

ALTER TABLE public.gate_entries
  ADD COLUMN IF NOT EXISTS phone_country_code text NOT NULL DEFAULT '+91';

ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'General Shift (9 AM - 6 PM)';

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
GRANT ALL ON public.user_tab_permissions TO service_role;
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable by authenticated" ON public.user_tab_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage permissions" ON public.user_tab_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_user_tab_permissions_user ON public.user_tab_permissions(user_id);
CREATE TRIGGER trg_user_tab_permissions_touch BEFORE UPDATE ON public.user_tab_permissions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  proprietor_owner_name text,
  contact_person text,
  registration_number text,
  phone1 text,
  phone2 text,
  phone3 text,
  email text,
  website text,
  contract_start_date date,
  contract_end_date date,
  contract_amount numeric(14,2),
  contract_particulars text,
  contract_document_path text,
  contract_document_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
GRANT ALL ON public.contractors TO service_role;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractors authenticated access" ON public.contractors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_contractors_touch BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.official_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  document_description text,
  additional_remarks text,
  document_type text NOT NULL DEFAULT 'Normal',
  document_path text,
  document_file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_records TO authenticated;
GRANT ALL ON public.official_records TO service_role;
ALTER TABLE public.official_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "official records authenticated access" ON public.official_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_official_records_touch BEFORE UPDATE ON public.official_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.mc_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  primary_portfolio text,
  secondary_portfolio text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_repository TO authenticated;
GRANT ALL ON public.mc_repository TO service_role;
ALTER TABLE public.mc_repository ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc repository authenticated access" ON public.mc_repository FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_mc_repository_touch BEFORE UPDATE ON public.mc_repository FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.ec_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  general_body_approved_date date,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ec_repository TO authenticated;
GRANT ALL ON public.ec_repository TO service_role;
ALTER TABLE public.ec_repository ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec repository authenticated access" ON public.ec_repository FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ec_repository_touch BEFORE UPDATE ON public.ec_repository FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.facility_management_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  task_type text NOT NULL DEFAULT 'Regular',
  assigned_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  assigned_department text,
  task_description text,
  task_start_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date date,
  status text NOT NULL DEFAULT 'Started',
  frequency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_management_tasks TO authenticated;
GRANT ALL ON public.facility_management_tasks TO service_role;
ALTER TABLE public.facility_management_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facility tasks authenticated access" ON public.facility_management_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_facility_tasks_touch BEFORE UPDATE ON public.facility_management_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.bye_law_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bye_law_type text NOT NULL DEFAULT 'Existing',
  document_name text NOT NULL,
  document_description text,
  gb_approved_date date,
  effective_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bye_law_repository TO authenticated;
GRANT ALL ON public.bye_law_repository TO service_role;
ALTER TABLE public.bye_law_repository ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bye law authenticated access" ON public.bye_law_repository FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_bye_law_repository_touch BEFORE UPDATE ON public.bye_law_repository FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();