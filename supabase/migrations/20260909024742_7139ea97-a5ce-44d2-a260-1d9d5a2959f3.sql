ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS relieving_date date,
  ADD COLUMN IF NOT EXISTS reference_name text,
  ADD COLUMN IF NOT EXISTS reference_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS occupant_type text NOT NULL DEFAULT 'family';

CREATE TABLE IF NOT EXISTS public.staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_documents TO authenticated;
GRANT ALL ON public.staff_documents TO service_role;

ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff documents manage" ON public.staff_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);