-- Contractor company and contract management.
-- Additive migration: preserves existing staff records.

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

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS staff_type text NOT NULL DEFAULT 'Permanent',
  ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL;

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_phone1_digits_10;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_phone1_digits_10
  CHECK (phone1 IS NULL OR phone1 = '' OR phone1 ~ '^[0-9]{10}$');

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_phone2_digits_10;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_phone2_digits_10
  CHECK (phone2 IS NULL OR phone2 = '' OR phone2 ~ '^[0-9]{10}$');

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_phone3_digits_10;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_phone3_digits_10
  CHECK (phone3 IS NULL OR phone3 = '' OR phone3 ~ '^[0-9]{10}$');

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_contract_period_valid;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_contract_period_valid
  CHECK (
    contract_start_date IS NULL
    OR contract_end_date IS NULL
    OR contract_end_date >= contract_start_date
  );

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_amount_nonnegative;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_amount_nonnegative
  CHECK (contract_amount IS NULL OR contract_amount >= 0);

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_staff_type_valid;
ALTER TABLE public.staff ADD CONSTRAINT staff_staff_type_valid
  CHECK (staff_type IN ('Permanent', 'Contractor'));

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_contractor_required;
ALTER TABLE public.staff ADD CONSTRAINT staff_contractor_required
  CHECK (
    (staff_type = 'Contractor' AND contractor_id IS NOT NULL)
    OR
    (staff_type = 'Permanent' AND contractor_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_contractors_company_name_lower
  ON public.contractors(lower(company_name));

CREATE INDEX IF NOT EXISTS idx_contractors_registration_number
  ON public.contractors(registration_number);

CREATE INDEX IF NOT EXISTS idx_contractors_contract_period
  ON public.contractors(contract_start_date, contract_end_date);

CREATE INDEX IF NOT EXISTS idx_staff_staff_type
  ON public.staff(staff_type);

CREATE INDEX IF NOT EXISTS idx_staff_contractor_id
  ON public.staff(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractors readable by authenticated" ON public.contractors;
CREATE POLICY "contractors readable by authenticated"
  ON public.contractors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contractors manageable by authenticated" ON public.contractors;
CREATE POLICY "contractors manageable by authenticated"
  ON public.contractors FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_contractors_touch ON public.contractors;
CREATE TRIGGER trg_contractors_touch
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Private storage for contract documents.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-documents', 'contractor-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "contractor documents authenticated read" ON storage.objects;
CREATE POLICY "contractor documents authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contractor-documents');

DROP POLICY IF EXISTS "contractor documents authenticated upload" ON storage.objects;
CREATE POLICY "contractor documents authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contractor-documents');

DROP POLICY IF EXISTS "contractor documents authenticated delete" ON storage.objects;
CREATE POLICY "contractor documents authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contractor-documents');
